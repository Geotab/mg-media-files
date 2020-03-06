// Mocks of MyGeotab objects, these not the full objects, only what we need for our tests
var server = 'www.myaddin.com';
var user = {
  id: 'b1',
  language: 'en',
  firstName: 'Zom',
  lastName: 'Bie',
  name: 'zombie@underworld.dead',
  password: 'eat-the-living'
};
var login = {
  userName: user.name,
  password: user.password,
  database: 'zombie',
  server: server
};
var credentials = {
  credentials: {
    database: login.database,
    sessionId: '3225932739582116430',
    userName: login.userName,
    server: 'ThisServer'
  }
};
var device = {
  id: 'b1',
  licensePlate: 'ZOM B389',
  vehicleIdentificationNumber: 'AM32W8FV9BU601382',
  comment: 'Comment',
  name: 'Beefo',
  serialNumber: 'G70000000000'
};
var tag = {
    version: '0000000000000001',
    name: 'test',
    id: 'b1'
};
var mediaFile = {
    id: 'b1',
    mediaType: 'Image',
    device: { id: device.id },
    driver: { id: user.id },
    fromDate: '2020-01-21T12:33:08.017Z',
    toDate: '2020-01-21T12:33:08.017Z',
    tags: [{ id: tag.id }],
    thumbnails: [],
    status: 'Ready',
    metaData: { width: 700 },
    solutionId: 'adDcLOG8Q9UaRs3eSgGunTA',
    version: '0000000000000001',
    name: 'test.jpg',
};

module.exports = {
  server,
  login,
  user,
  credentials,
  device,
  tag,
  mediaFile
};
