# Media Files

This is a console example of Adding, Uploading, Getting, Downloading and Setting a Media File.

Steps:

1. Process command line arguments: Server, Database, Username, Password and InputFile. Accepts .jpg, .png, .gif, .webp, .mp4 file formats.
1. Create Geotab API object and Authenticate.
1. Adding a MediaFile object.
1. Using a third-party library to resize image binaries.
1. Uploading MediaFile binary data.
1. Updating a MediaFile object with metadata.
1. Downloading MediaFile binary data.

## Prerequisites

The sample application requires:

- Latest [.Net core SDK](https://dot.net/core)

## Getting started

```shell
> git clone https://github.com/Geotab/mg-media-files.git mg-media-files
> cd mg-media-files/dotnet-media-files
> dotnet run "my.geotab.com" "database" "user@email.com" "password" "sample-image-01.jpg"
```
