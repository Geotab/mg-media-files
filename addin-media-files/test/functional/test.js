const puppeteer = require('puppeteer');
const mocks = require('./mocks/mocks.js');
const assert = require('chai').assert;

// JSON-RPC helpers
const rpcRequest = body => {
    let decodedBody = decodeURIComponent(body);
    let json = decodedBody.replace('JSON-RPC=', '');
    return JSON.parse(json);
};

const rpcResponse = (response, err) => {
    return {
        id: -1,
        result: response,
        error: err
    };
};

// puppeteer options
const opts = {
    headless: true,
    slowMo: 0,
    timeout: 10000
};

// test
describe('User visits addin', () => {

    let browser,
        page;

    // Open Page
    before(async () => {
        browser = await puppeteer.launch(opts);
        page = await browser.newPage();
        await page.emulateTimezone('America/Toronto');

        // Allowing puppeteer access to the request - needed for mocks
        await page.setRequestInterception(true);

        // Setup mocks
        await page.on('request', request => {
            if (request.url() === `http://${mocks.server}/apiv1`) {

                let rpcBody = rpcRequest(request.postData());
                let payload = '';

                switch (rpcBody.method) {
                    case 'Authenticate':
                        payload = mocks.credentials;
                        break;
                    case 'ExecuteMultiCall':
                        payload = [];
                        for (let index = 0; index < rpcBody.params.calls.length; index++) {
                            const element = rpcBody.params.calls[index];
                            switch (element.params.typeName) {
                                case 'Device':
                                    payload.push([mocks.device]);
                                    break;
                                case 'User':
                                    payload.push([mocks.user]);
                                    break;
                            }
                        }
                        break;
                    case 'Get':
                        switch (rpcBody.params.typeName) {
                            case 'Device':
                                payload = [mocks.device];
                                break;
                            case 'User':
                                payload = [mocks.user];
                                break;
                            case 'MediaFile':
                                payload = [mocks.mediaFile];
                                break;
                            case 'Tag':
                                payload = [mocks.tag];
                                break;
                        }
                }

                request.respond({
                    content: 'application/json',
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify(rpcResponse(payload))
                });
            } else {
                request.continue();
            }
        });

        // Login
        await page.goto('http://localhost:9000/');
        let loggedIn = await page.evaluate( () => {
            let dialogWindow = document.getElementById('loginDialog');
            return (dialogWindow.style.display = 'none' ? true : false);

        })
        if(loggedIn){
            await page.click('#logoutBtn');
        }
        await page.waitFor('#loginDialog');
        await page.type('#email', mocks.login.userName);
        await page.type('#password', mocks.login.password);
        await page.type('#database', mocks.login.database);
        await page.type('#server', mocks.server);
        await page.click('#loginBtn');
    });

    // Confirm page has loaded
    it('should be loaded', async () => {
        await page.waitFor('html', {
            visible: true
        });      
    });
  
   // Confirm page displaying after initialized and focus is called
    it('should display root div', async () => {
        await page.waitFor('#addinMediaFiles', {
            visible: true
        });
    });

    // Navbar tests
    it('should have a navbar', async () => {
        let navbar = await page.$('#menuId') !== null;
        assert.isTrue(navbar, 'Navbar does not exist');
    });

    it('nav bar should collapse', async () => {
        await page.click('#menuToggle');
        let collapsed = await page.evaluate( () => {
            let nav = document.querySelector('#menuId');
            return nav.className.includes('menuCollapsed');
        });
        assert.isTrue(collapsed, 'Navbar does not collapse');
    });

    it('nav bar should extend from collapsed state', async () => {
        await page.click('#menuToggle');

        let extended = await page.evaluate( () => {
            let nav = document.querySelector('#menuId');
            return !nav.className.includes('menuCollapsed');
        });
        assert.isTrue(extended, 'Navbar did not re-extend');
    });

    it('display the media file information', async () => {
        let getTextContentAtNthChild = async (index) => {
            return await page.evaluate((x) => {
                return document.querySelector(`td.cell:nth-child(${x})`).textContent;
            }, index);
        };
        assert.equal(await getTextContentAtNthChild(1), mocks.mediaFile.name, 'name');
        assert.equal(await getTextContentAtNthChild(2), mocks.mediaFile.mediaType, 'media type');
        assert.equal(await getTextContentAtNthChild(3), mocks.mediaFile.status, 'status');
        assert.equal(await getTextContentAtNthChild(4), mocks.mediaFile.solutionId, 'solution ID');
        assert.equal(await getTextContentAtNthChild(5), '01/21/2020 07:33 am', 'from date');
        assert.equal(await getTextContentAtNthChild(6), '01/21/2020 07:33 am', 'to date');
        assert.equal(await getTextContentAtNthChild(7), mocks.device.name, 'device name');
        assert.equal(await getTextContentAtNthChild(8), mocks.user.name, 'driver name');
        assert.equal(await getTextContentAtNthChild(10), JSON.stringify(mocks.mediaFile.metaData, null, 2), 'meta data');
    });
        
    it('blur button clear media', async () => {
        await page.click('#toggleBtn');
        let cleared = await page.evaluate( () => {
            let toggled = false;
            let rows = document.querySelectorAll('tr');
            if(rows.length < 2){
                toggled = true;
            }
            return toggled;
        });
        assert.isTrue(cleared, 'media files cleared');
    });

    it('focus button should focus addin', async () => {
        await page.click('#toggleBtn');

        let hidden = await page.evaluate( () => {
            let toggled = false;
            let addin = document.getElementById('addinMediaFiles');
            if(addin.className.includes('hidden')){
                toggled = true;
            }
            return toggled;
        });
        assert.isFalse(hidden, 'add-in is hidden');
    });
        
    
    // Mock function tests
    it('should authenticate api', async () => {
        let success = await page.evaluate( () => {
            let authenticated = false;
            api.getSession( (credentials, server) => {
                if(server !== 'undefined' && credentials !== 'undefined'){
                    authenticated = true;
                }
            });
            return authenticated;
        });
        assert.isTrue(success, 'api is not authenticating properly');
    })

    it('add-in should exist in geotab object', async () => {
        let keyLength = await page.evaluate( () => {
            
            let len = Object.keys(geotab.addin).length
            
            return len;
        });
        assert.isTrue(keyLength > 0, `Add-in is not present in mock backend`);
    });  

    it('should load the state object', async () => {
        let state = await page.evaluate( () => {
            let stateExists = typeof state == 'object';
            return stateExists;
        });
        assert.isTrue(state, 'State is not defined');
    });

    // Tests Finished
    after(async () => {
        await browser.close();
    });

});
