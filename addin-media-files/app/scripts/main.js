import Vue from 'vue/dist/vue';
import VueMultiselect from 'vue-multiselect/dist/vue-multiselect.min.js';
import VueLazyload from 'vue-lazyload/vue-lazyload';
import moment from 'moment/moment';

/**
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.addinMediaFiles = function () {
    'use strict';

    //Vue.component('vue-multiselect', window.VueMultiselect.default)

    // the root container
    let addinVue;
    let api;

    // media files require an id which uniqly identifies the solution they belong to
    // this is so one solution doesn't display the media of another solution
    const solutionId = 'adDcLOG8Q9UaRs3eSgGunTA';

    let successTimout;

    /**
     * Displays a successful message in UI for 3000 ms.
     */
    const success = () => {
        addinVue.success = 'Upload complete';
        clearTimeout(successTimout);
        successTimout = setTimeout(() => {
            addinVue.success = false;
        }, 3000);
    };

    let errorTimout;

    /**
     * Displays an error message in the UI for 5000 ms.
     * @param {*} err The error or message to display.
     */
    const errorHandler = err => {
        addinVue.error = err.message || err;
        console.log(JSON.stringify(err));
        clearTimeout(errorTimout);
        errorTimout = setTimeout(() => {
            addinVue.error = null;
        }, 5000);
    };

    /**
     * Gets the content type from media file name.
     * @param {object} mediaFile The media file.
     * @returns {string} The derived content type.
     */
    const getContentType = mediaFile => {
        let nameparts = mediaFile.name.split('.');
        let extention = nameparts[nameparts.length - 1];
        switch (extention) {
            case 'mp4':
                return 'video/mp4';
            case 'png':
                return 'image/png'
            case 'jpg':
                return 'image/jpeg'
            case 'webp':
                return 'image/webp'
            case 'gif':
                return 'image/gif'
            default:
                throw Error(`unknown file extention: ${extention}`);
        }
    };

    /**
     * Resize an image to scale to the provided width.
     * @param {object} mediaFile The media file.
     * @param {int} width The intended image width.
     * @returns {object} media file with resized image.
     */
    const resizeImage = (mediaFile, width) => {
        return new Promise((resolve, reject) => {
            const contentType = getContentType(mediaFile);

            // will not resize video or images which might be animated
            if (contentType.startsWith('video') || contentType.endsWith('webp') || contentType.endsWith('gif')) {
                return resolve(mediaFile);
            }

            const fileName = mediaFile.file.name;
            const reader = new FileReader();

            reader.readAsDataURL(mediaFile.file);
            reader.onerror = reject;
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const elem = document.createElement('canvas');

                    const scaleFactor = width / img.width;
                    elem.width = width;
                    elem.height = img.height * scaleFactor;

                    const ctx = elem.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, img.height * scaleFactor);
                    ctx.canvas.toBlob((blob) => {
                        mediaFile.file = new File([blob], fileName, {
                            type: contentType,
                            lastModified: Date.now()
                        });

                        resolve(mediaFile);
                    }, contentType, 1);
                };
            };
        });

    }

    /**
     * Upload the binary file for a media file object.
     * @param {object} mediaFile The media file.
     * @returns {object} The uppladed media file.
     */
    const uploadFile = (mediaFile) => {
        return new Promise((resolve, reject) => {
            var fd = new FormData();
            const file = mediaFile.file;
            var parameters = {
                method: 'UploadMediaFile',
                params: {
                    credentials: addinVue.credentials,
                    mediaFile: { 'id': mediaFile.id }
                }
            };
            let xhr = new XMLHttpRequest();
            if (file) {
                fd.append('JSON-RPC', encodeURIComponent(JSON.stringify(parameters)));
                fd.append(mediaFile.name, file, mediaFile.name);

                xhr.addEventListener('load', function (e) {
                    e.preventDefault();
                    if (e.target && e.target['responseText'].length > 0) {
                        try {
                            let jsonResponse = JSON.parse(e.target['responseText']);
                            if (!jsonResponse.error) {
                                resolve(mediaFile);
                            } else {
                                reject(jsonResponse.error);
                            }
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(e);
                        xhr && xhr.abort();
                    }
                }, false);
                xhr.addEventListener('error', function (e) {
                    if (e.target || (e instanceof XMLHttpRequest && e.status === 0)) {
                        reject('Network Error: Couldn\'t connect to the server. Please check your network connection and try again.');
                    } else {
                        reject(e);
                    }
                }, false);
                xhr.open('POST', `https://${addinVue.host}/apiv1/`);
                xhr.setRequestHeader('Accept', 'application/json, */*;q=0.8');
                addinVue.success = 'Uploading...';
                try {
                    xhr.send(fd);
                } catch (e) {
                    reject(e);
                }
            }
        });
    }

    /**
     * Populate media file meta data from media.
     * @param {object} mediaFile The media file.
     * @returns {object} media file with popoulated meta data.
     */
    const populateMetaData = mediaFile => {
        return new Promise((resolve, reject) => {
            if (mediaFile.name.endsWith('.mp4')) {
                var url = URL.createObjectURL(mediaFile.file);
                let video = document.createElement('video');
                video.onerror = reject;
                video.onloadeddata = () => {
                    mediaFile.metaData = {
                        size: mediaFile.file.size,
                        width: video.videoWidth,
                        height: video.videoHeight
                    };
                    resolve(mediaFile);
                }
                video.src = url;
                video.load();
            } else {
                var fr = new FileReader();
                fr.onload = (fileReader) => {
                    let result = fileReader.srcElement.result;
                    let image = document.createElement('img');
                    image.onload = () => {
                        mediaFile.metaData = {
                            size: mediaFile.file.size,
                            width: image.width,
                            height: image.height
                        };
                        resolve(mediaFile);
                    };
                    image.onerror = reject;
                    image.src = result;
                };
                fr.onerror = reject;
                fr.readAsDataURL(mediaFile.file);
            }
        });
    }

    /**
     * Sets a media file.
     * @param {object} mediaFile
     */
    const updateMetaData = mediaFile => {
        return new Promise((resolve, reject) => {
            api.call('Set', {
                typeName: 'MediaFile',
                entity: mediaFile
            }, resolve, reject);
        });
    }

    /**
     * Get all tags.
     * @returns {array} A list of tags.
     */
    const getTags = () => {
        return new Promise((resolve, reject) => {
            api.call('Get', {
                typeName: 'Tag'
            }, resolve, reject)
        });
    }

    /**
     * Gets devices based on provided name.
     * @param {string} name The name of the device or no name.
     * @returns {array} A list of devices.
     */
    const getDevices = (name) => {
        return new Promise((resolve, reject) => {
            if (name) {
                name = `%${name}%`;
            }
            api.call('Get', {
                typeName: 'Device',
                resultsLimit: 500,
                search: {
                    name,
                    fromDate: new Date()
                }
            }, devices => {
                resolve(devices);
            }, reject)
        });
    }

    /**
     * Gets drivers based on provided name.
     * @param {string} name The name of the driver or no name.
     * @returns {array} A list of drivers.
     */
    const getDrivers = (name) => {
        return new Promise((resolve, reject) => {
            if (name) {
                name = `%${name}%`;
            }
            api.call('Get', {
                typeName: 'User',
                resultsLimit: 500,
                search: {
                    name,
                    fromDate: new Date(),
                    isDriver: true
                }
            }, drivers => {
                resolve(drivers);
            }, reject)
        });
    }

    return {
        /**
         * initialize() is called only once when the Add-In is first loaded. Use this function to initialize the
         * Add-In's state such as default values or make API requests (MyGeotab or external) to ensure interface
         * is ready for the user.
         * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
         * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
         * @param {function} initializeCallback - Call this when your initialize route is complete. Since your initialize routine
         *        might be doing asynchronous operations, you must call this method when the Add-In is ready
         *        for display to the user.
         */
        initialize: function (freshApi, freshState, initializeCallback) {
            api = freshApi;
            Vue.use(VueLazyload);
            Vue.filter('formatDate', function (value) {
                if (value) {
                    return moment(String(value)).format('MM/DD/YYYY hh:mm a')
                }
            });
            addinVue = new Vue({
                el: '#addinMediaFiles',
                data: {
                    success: false,
                    error: null,
                    host: 'localhost',
                    mediaFiles: [],
                    mediaFile: {
                        solutionId,
                        tags: [],
                        thumbnails: []
                    },
                    tags: [],
                    devices: [],
                    drivers: [],
                    credentials: {}
                },
                components: {
                    Multiselect: VueMultiselect
                },
                computed: {

                },
                filters: {
                    pretty(value) {
                        try {
                            return JSON.stringify(value, null, 2);
                        } catch (ex) {
                            return '';
                        }
                    }
                },
                methods: {
                    list() {
                        return new Promise((resolve, reject) => {
                            document.querySelector('#tab1').click();
                            api.call('Get', {
                                typeName: 'MediaFile',
                                resultsLimit: 100
                            }, result => {
                                result.sort((a, b) => {
                                    return new Date(b.fromDate) - new Date(a.fromDate);
                                });

                                // populate
                                let deviceCache = {};
                                let driverCache = {};
                                let deviceMultiCall = [];
                                let driverMultiCall = [];

                                result.forEach(mf => {
                                    let deviceId = mf.device.id;
                                    if (deviceId) {
                                        let device = deviceCache[deviceId];
                                        if (device) {
                                            return;
                                        }
                                        deviceMultiCall.push(['Get', { typeName: 'Device', search: { id: deviceId } }]);
                                    }
                                    let driverId = mf.driver.id;
                                    if (driverId) {
                                        let driver = driverCache[driverId];
                                        if (driver) {
                                            return;
                                        }
                                        driverMultiCall.push(['Get', { typeName: 'User', search: { id: driverId } }]);
                                    }
                                });

                                let calls = deviceMultiCall.concat(driverMultiCall);
                                let populateFromCache = mediaFiles => {
                                    mediaFiles.forEach(mf => {
                                        let deviceId = mf.device.id;
                                        if (deviceId && deviceCache[deviceId]) {
                                            mf.device = deviceCache[deviceId];
                                        }
                                        let driverId = mf.driver.id;
                                        if (driverId && driverCache[driverId]) {
                                            mf.driver = driverCache[driverId];
                                        }
                                    });
                                };

                                if (calls.length < 1) {
                                    populateFromCache(result);
                                    addinVue.mediaFiles = result;
                                    resolve(result);
                                    return;
                                }

                                api.multiCall(deviceMultiCall.concat(driverMultiCall), mcResult => {
                                    mcResult.forEach((entity, i) => {
                                        if (i < deviceMultiCall.length) {
                                            deviceCache[entity[0].id] = entity[0];
                                        } else {
                                            driverCache[entity[0].id] = entity[0];
                                        }
                                    });

                                    populateFromCache(result);
                                    resolve(result);
                                }, reject);
                            }, reject);
                        })
                            .then(mediaFiles => {
                                return new Promise(resolve => {
                                    api.getSession(cr => {
                                        // some hacks here for local development where browser host will not match api host
                                        const getUrl = s => {
                                            if (s.startsWith('http')) {
                                                return new URL(s).hostname;
                                            }
                                            return s;
                                        };
                                        addinVue.host = cr.server ? getUrl(cr.server) : document.location.hostname;
                                        addinVue.credentials = cr.credentials || cr;
                                        addinVue.mediaFiles = mediaFiles;
                                        resolve(mediaFiles);
                                    });
                                });
                            })
                            .catch(errorHandler);
                    },
                    remove(mediaFile) {
                        return new Promise((resolve, reject) => {
                            api.call('Remove', {
                                typeName: 'MediaFile',
                                entity: {
                                    id: mediaFile.id
                                }
                            }, result => {
                                resolve();
                            }, reject);
                        }).then(addinVue.list).catch(errorHandler);
                    },
                    filesChange(fileList) {
                        if (!fileList.length) {
                            return;
                        }

                        addinVue.mediaFile.file = fileList[0];
                        if (!addinVue.mediaFile.name) {
                            addinVue.mediaFile.name = name;
                        }
                    },
                    upload() {
                        var mediaFile = addinVue.mediaFile;

                        return new Promise((resolve, reject) => {
                            if (!mediaFile.file) {
                                throw new Error('Missing file');
                            }

                            mediaFile.name = mediaFile.file.name;
                            mediaFile.fromDate = mediaFile.fromDate || new Date();
                            mediaFile.thumbnails = (mediaFile.thumbnails || []).map(t => { return { id: t.id } });

                            api.call('Add', {
                                typeName: 'MediaFile',
                                entity: mediaFile
                            }, result => {
                                mediaFile.id = result;
                                resolve(mediaFile);
                            }, reject)
                        })
                            .then(mf => resizeImage(mf, 480))
                            .then(uploadFile)
                            .then(populateMetaData)
                            .then(updateMetaData)
                            .then(success)
                            .then(addinVue.list)
                            .then(getTags)
                            .then(tags => addinVue.tags = tags)
                            .then(addinVue.list)
                            .catch(errorHandler)
                            .then(() => {
                                addinVue.mediaFile = {
                                    solutionId
                                };
                                document.querySelector('#file').value = '';
                            })
                            .catch(errorHandler);
                    },
                    addTag(tag) {
                        addinVue.mediaFile.tags.push({ name: tag });
                    },
                    addThumbnail(name) {
                        addinVue.mediaFile.thumbnails.push({ id: mediaFiles.find(mf => mf.name === name)[0].id });
                    },
                    entityLabel(option) {
                        return option.name;
                    },
                    searchDevices(term) {
                        return getDevices(term)
                            .then(devices => addinVue.devices = devices)
                            .catch(errorHandler);
                    },
                    deviceLabel(device) {
                        return device.name;
                    },
                    searchDrivers(term) {
                        return getDrivers(term)
                            .then(drivers => addinVue.drivers = drivers)
                            .catch(errorHandler);
                    },
                    driverLabel(driver) {
                        return driver.name;
                    },
                    getDownloadUrl(mediafile) {
                        let credentials = addinVue.credentials;
                        let userName = encodeURIComponent(credentials.userName);
                        let database = encodeURIComponent(credentials.database);
                        let sessionId = encodeURIComponent(credentials.sessionId);
                        let id = mediafile.id;
                        return `https://${addinVue.host}/apiv1/DownloadMediaFile?mediaFile={"id":"${id}"}&credentials={"userName":"${userName}","database":"${database}","sessionId":"${sessionId}"}`;
                    }
                }
            });
            // MUST call initializeCallback when done any setup
            initializeCallback();
        },

        /**
         * focus() is called whenever the Add-In receives focus.
         *
         * The first time the user clicks on the Add-In menu, initialize() will be called and when completed, focus().
         * focus() will be called again when the Add-In is revisited. Note that focus() will also be called whenever
         * the global state of the MyGeotab application changes, for example, if the user changes the global group
         * filter in the UI.
         *
         * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
         * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
         */
        focus: function (freshApi, freshState) {
            addinVue.list();
            getTags()
                .then(tags => addinVue.tags = tags)
                .catch(errorHandler);
            getDevices()
                .then(devices => addinVue.devices = devices)
                .catch(errorHandler);
            getDrivers()
                .then(drivers => addinVue.drivers = drivers)
                .catch(errorHandler);
        },

        /**
         * blur() is called whenever the user navigates away from the Add-In.
         *
         * Use this function to save the page state or commit changes to a data store or release memory.
         *
         * @param {object} freshApi - The GeotabApi object for making calls to MyGeotab.
         * @param {object} freshState - The page state object allows access to URL, page navigation and global group filter.
         */
        blur: function () {
            addinVue.mediaFiles = [];
        }
    };
};
