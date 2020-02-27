using Geotab.Checkmate;
using Geotab.Checkmate.ObjectModel;
using Geotab.Checkmate.ObjectModel.Files;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace MediaFiles.Test
{
    public class MediaFileExampleTest
    {
        [Theory]
        [InlineData("image-sample-1280x720", ".jpg")]
        [InlineData("video-sample-320x180", ".mp4")]
        public async Task TestAsync(string name, string extention)
        {
            var baseFile = new FileInfo($"./Resources/{name}{extention}");
            var testFileName = Path.Combine(Path.GetTempPath(), Path.GetTempFileName() + extention);
            
            baseFile.CopyTo(testFileName, true);
            var testFile = new FileInfo(testFileName);
            FileInfo uploadedFile = null;

            try
            {
                var expectedId = Id.Create(Guid.NewGuid());
                var api = new MockApi(new MediaFile { Id = expectedId });
                var example = new MediaFileExample(api);

                await example.Run(testFile);

                uploadedFile = new FileInfo(Path.Combine(api.TempFileLocation, testFile.Name));
                Assert.True(uploadedFile.Exists);

                var mediaFile = api.MediaFile;
                var size = JObject.Parse(mediaFile.MetaData)["size"];

                Assert.Equal(expectedId, mediaFile.Id);

                Assert.Equal(uploadedFile.Length, size);

                // example only resizes images
                if (mediaFile.MediaType != MediaType.Video)
                {
                    Assert.NotEqual(testFile.Length, size);
                }

                File.Delete(uploadedFile.FullName);
            }
            finally
            {
                File.Delete(testFile.FullName);
                if (uploadedFile != null)
                {
                    File.Delete(uploadedFile.FullName);
                }
            }

        }

        class MockApi : IApi
        {
            public MockApi(MediaFile mediaFile)
            {
                MediaFile = mediaFile;
                TempFileLocation = Path.Combine(Path.GetTempPath(), nameof(MediaFileExampleTest));
                if (!Directory.Exists(TempFileLocation))
                {
                    Directory.CreateDirectory(TempFileLocation);
                }
            }

            public MediaFile MediaFile { get; set; }

            public string TempFileLocation { get; }

            public string UserName { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }
            public string Password { set => throw new NotImplementedException(); }
            public string SessionId { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }
            public string Database { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }
            public string Server { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }
            public LoginResult LoginResult { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }
            public int Timeout { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }

            public void Authenticate()
            {
                throw new NotImplementedException();
            }

            public Task AuthenticateAsync(CancellationToken cancellationToken = default)
            {
                throw new NotImplementedException();
            }

            public T Call<T>(string method, Type type, object parameters = null)
            {
                throw new NotImplementedException();
            }

            public T Call<T>(string method, object parameters = null)
            {
                throw new NotImplementedException();
            }

            public Task<T> CallAsync<T>(string method, object parameters = null, CancellationToken cancellationToken = default)
            {
                throw new NotImplementedException();
            }

            public Task<T> CallAsync<T>(string method, Type type, object parameters = null, CancellationToken cancellationToken = default)
            {
                if (type != typeof(MediaFile))
                {
                    throw new ArgumentException($"Unsupported type: {type}");
                }

                object result = null;
                if (string.Equals("Add", method, StringComparison.Ordinal))
                {
                    result = MediaFile.Id;
                    var mediaFile = FromParameters(parameters);
                    Assert.NotNull(mediaFile);
                    mediaFile.Id = MediaFile.Id;
                    mediaFile.MediaType = mediaFile.Name.EndsWith(".mp4", StringComparison.Ordinal) ? MediaType.Video : MediaType.Image;
                    MediaFile = mediaFile;
                }
                if (string.Equals("Get", method, StringComparison.Ordinal))
                {
                    result = new List<MediaFile>() { MediaFile };
                }
                if (string.Equals("Set", method, StringComparison.Ordinal))
                {
                    var mediaFile = FromParameters(parameters);
                    Assert.NotNull(mediaFile);
                    Assert.Equal(MediaFile.Id, mediaFile.Id);
                    MediaFile = mediaFile;
                    result = null;
                }
                return Task.FromResult((T)result);
            }

            public object Clone()
            {
                throw new NotImplementedException();
            }

            public async Task DownloadAsync(Stream outputStream, MediaFile mediaFile, CancellationToken cancellationToken = default)
            {
                await using var fileReader = File.OpenRead(Path.Combine(TempFileLocation, mediaFile.Name));
                await fileReader.CopyToAsync(outputStream, cancellationToken);
            }

            public List<object> MultiCall(params object[] arguments)
            {
                throw new NotImplementedException();
            }

            public Task<List<object>> MultiCallAsync(params object[] arguments)
            {
                throw new NotImplementedException();
            }

            public async Task UploadAsync(Stream inputStream, MediaFile mediaFile, CancellationToken cancellationToken = default)
            {
                await using var fileWriter = File.Create(Path.Combine(TempFileLocation, mediaFile.Name));
                await inputStream.CopyToAsync(fileWriter, cancellationToken);
                MediaFile.Status = Status.Ready;
            }

            static MediaFile FromParameters(object parameters)
            {
                const string entityProperty = "entity";
                var propertyInfo = parameters.GetType().GetProperty(entityProperty);
                return propertyInfo.GetValue(parameters, null) as MediaFile;
            }
        }
    }
}
