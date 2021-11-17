# Media File - Beta

The media file API provides a persistent storage mechanism for binary media files and meta data. There are two components of a media file:

- The `MediaFile` entity which describes the binary media. This is similar to other generic entity types in the API and follows the generic entity method pattern (`Add`, `Get`, `Set`, `Remove`, `GetFeed`).

- The binary data of the media file. This the the actual file, for example a jpeg image. The binary files are interacted with using bespoke methods `DownloadMediaFile` and `UploadMediaFile`.

## Object Model

### MediaFile

Property | Type | Description
--- | --- | ---
id | string | The unique identifier.
version | string | Entity version. Read-only.
name* | string | File name. Must have extension. Max 128 characters. All lower case. Required. Unique.
mediaType | string | Describes the type of media. Read- only. `Video`, `Image`
status | string | Describes the processing status of the file. Read-only. `NoFile`, `Processing`, `Ready`
solutionId* | string | The unique identifier of the solution. Required.
fromDate | ISO UTC date time string | The from date of the media. Default[UTC now]
toDate | ISO UTC date time string | The from date of the media. Default[fromDate]
device | object[Device] | The device associated to the media.
driver | object[Driver] | The driver associated to the media.
metaData | object | Free JSON field. Max 10,000 character JSON limit. Property names cannot start with "geotab".
thumbnails | array[MediaFile] | The list of other media files serving as the thumbnails for this media file. Max 5 thumbnails.
tags | array[Tag] | The list of tags used to classify the media. Max 10 tags.

*Required when adding

#### Solution Id

A SolutionId must be created before the Storage API methods can be used within your solution. This encoded GUID is used to register and identify which solution some data is associated with. SolutionId is a mandatory parameter when calling MediaFile Add, optionally with Get. This allows each solutions' data to be isolated from the data used by other solutions. This allows multiple solutions to each have their own collection of MediaFile objects in the same database without the collections mixing. To generate your own SolutionId, please use following [example](https://geotab.github.io/sdk/software/api/runner.html#sample:generate-addin-guid).

> SolutionId and AddInId are interchangeable. If you have an add-in or integration which uses both AddInData and MediaFile you are encouraged to use a single SolutionId/AddInId.

### MediaFileSearch

Property | Type | Description
--- | --- | ---
Id | object[Id] | Search for a single MediaFile by `Id`.
deviceSearch | object[DeviceSearch] | Search for MediaFile records relating to this DeviceSearch Id. Available DeviceSearch options are: `Id` and `Groups`.
driverSearch | object[DriverSearch] | Search for  MediaFile records relating to this DriverSearch Id. Available DeviceSearch options are: `Id`.
fromDate | ISO UTC date time string | Search for MediaFile records that were logged at this date or after.
toDate | ISO UTC date time string | Search for MediaFile records that were logged at this date or before.

### Tag

Property | Type | Description
--- | --- | ---
Id | string | GUID backed unique identifier.
Version | string | Entity version. Read-only.
Name* | string | File name. Must have extension. Max 1024 characters. All lower case. Required. Unique.

*Required when adding

### Thumbnails

A media file can reference a list of up to 5 other media files which serve as the thumbnail for it via the `MediaFile.Thumbnails` collection. For example a video media file can reference a jpeg file which serves as it's thumbnail.

### Tags

Generic `Tags` can be linked to media files. Tags can be used to categorizing "like" media.
> Searching for media by `Tag` is not yet implemented.

## Supported File Types

Type | Extension | Content-Type
--- | --- | ---
Video | mp4 | video/mp4
Image | jpeg | image/jpeg
Image | png | image/png
Image | gif | image/gif
Image | webp | image/webp

## Security

### Credentials

Credentials are required for all `MediaFile` and `Tag` related requests.

### Security Clearances

There are two security clearances applying to media files. By default only administrator clearance will be able to modify files, while clearances derived from view only will be able to view files.
SecurityIdentifier: `ViewMedia`, `ManageMedia`

### Scope

Scope is evaluated by the scope of the requesting user to the linked entity(s) (`Device` and/or `Driver`) of the media file. A media file with no linked entity will be visible to any user in the database regardless of scope (requiring `ViewMedia` clearance).

## API

Method | Parameters | Returns | Notes
--- | --- | --- | ---
Add[MediaFile] | entity:object[MediaFile] | string[Id] | File is added via separate API. Status = NoFile.
Set[MediaFile]  | entity:object[MediaFile] | void | Updates MediaFile entity, not file.
Remove[MediaFile] | entity:object[MediaFile]] | void | Removes file and MediaFile entity.
Get[MediaFile] | resultsLimit:long,search:object[MediaFileSearch] | array[MediaFile] | Gets only MediaFile entity.
GetFeed[MediaFile] | resultsLimit:long,fromVersion:long | object[FeedResult] | Gets a feed of only media file entity.
DownloadMediaFile | mediaFile:object[MediaFile] | stream[File] | Content type determined by file extension. Range headers supported.
UploadMediaFile | mediaFile:object[MediaFIle],stream | void | Media file entity must already be added. Content-Type “multipart/form-data”. Not “application/json”

### Add

Adding a media file requires two steps:

First, adding the `MediaFile` entity using the generic `Add` method. The result of adding is the unique identifier (`Id`) of the added `MediaFile`. When the media file has been added but there is no binary uploaded the `MediaFile.Status` will be `NoFile`.

Second, uploading the `MediaFile` binary using the `UploadMediaFile` API specifying the `MediaFile` it relates to by `Id` in the JSON-RPC request. After a file is uploaded the `MediaFile.Status` will transition to `Processing` then `Ready`.

> `Processing` state is available but currently unused.

### Get

Like Add, Get requires two steps:

First, search for `MediaFile` using `MediaFileSearch` to provide search arguments.

Second, download the binary using the `DownloadMediaFile` method providing the `Id` of the media file.


## Limits

### Result Limit

A maximum of 10,000 MediaFile objects will be returned from Get:MediaFile and/or GetFeed:MediaFile requests.

### Rate Limit

**:MediaFile**
1000 requests per minute, per user

**GetFeed:MediaFile, Add:MediaFile, Set:MediaFile, Remove:MediaFile**
60 requests per minute, per user

**DownloadMediaFile**
240 file download requests per minute, per user

**UploadMediaFile**
60 file upload requests per minute, per user
10,000 file uploads per day, per user

### Size Limit

Image files (.png, .jpg, .gif, .webp) are limited to 10MB.
Video files (.mp4) are limited to 50MB.

> In MyGeotab v6.0 file size limits were increased. Images from 2MB to 10MB and of videos from 10MB to 50MB.
