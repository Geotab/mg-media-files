using Geotab.Checkmate;
using Geotab.Checkmate.ObjectModel;
using Geotab.Checkmate.ObjectModel.Files;
using ImageProcessor;
using ImageProcessor.Imaging;
using MetadataExtractor;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Tag = Geotab.Checkmate.ObjectModel.Files.Tag;

namespace MediaFiles
{
    public class MediaFileExample
    {
        readonly IApi api;

        public MediaFileExample(IApi api)
        {
            this.api = api;
        }

        public async Task Run(FileInfo file)
        {
            // -- Add a media file object which describes the binary file
            var mediaFile = new MediaFile
            {
                Name = file.Name, // the name of the file
                Tags = new List<Tag> { new Tag { Name = "SDK Example" } }, // the tags used as media qualifiers
                SolutionId = Id.Create(Guid.NewGuid()), // the unique solution ID of the integration
                FromDate = DateTime.UtcNow,
                ToDate = DateTime.UtcNow,
                Device = null, // possible to link to a device
                Driver = null, // possible to link to a driver
                Thumbnails = null // media files can serve as thumbnails for other media files
            };

            // optionally populate defaults before adding so we report default status to console
            mediaFile.PopulateDefaults();

            mediaFile.Id = await api.CallAsync<Id>("Add", typeof(MediaFile), new { entity = mediaFile });

            Console.WriteLine($"Added media file: {mediaFile.Name}. Status {mediaFile.Status}{Environment.NewLine}");

            // -- Resize and Upload the media file binary
            Console.WriteLine("Uploading file...");

            await using (var inputStream = File.OpenRead(file.FullName))
            {
                await using (var optimizedStream = ResizeImage(inputStream, mediaFile, 480, 320))
                {
                    // Update additional meta data for the image in free JSON meta data storage
                    mediaFile.MetaData = GetMetaData(optimizedStream, mediaFile);

                    await api.UploadAsync(optimizedStream, mediaFile);

                    Console.WriteLine($"Uploading file complete.{Environment.NewLine}");

                    Console.WriteLine($"Update meta data.{Environment.NewLine}");

                    await api.CallAsync<object>("Set", typeof(MediaFile), new { entity = mediaFile });
                }
            }

            // -- Get the media file to see that status is updated
            mediaFile = (await api.CallAsync<IEnumerable<MediaFile>>("Get", typeof(MediaFile), new { search = new MediaFileSearch(mediaFile.Id) })).FirstOrDefault();

            Console.WriteLine($"Media file: {mediaFile.Name}. Status {mediaFile.Status}{Environment.NewLine}");

            // -- Download the stored file
            Console.WriteLine("Downloading file...");

            var outputFile = Path.Combine(file.DirectoryName, $"{Path.GetRandomFileName()}{file.Extension}");
            await using (var outputStream = File.OpenWrite(outputFile))
            {
                await api.DownloadAsync(outputStream, mediaFile);
            }

            Console.WriteLine($"Downloading file complete: {outputFile}.{Environment.NewLine}");
        }

        /// <summary>
        /// Gets JSON string representing some meta-data about the file.
        /// </summary>
        /// <param name="inputStream">The file <see cref="Stream"/>.</param>
        /// <param name="mediaFile">The <see cref="MediaFile"/>.</param>
        /// <returns>A JSON <see cref="string"/> with information about the file.</returns>
        static string GetMetaData(Stream inputStream, MediaFile mediaFile)
        {
            // .Net Image can't understand webp
            if (mediaFile.Name.EndsWith(".webp"))
            {
                return JObject.FromObject(new { size = inputStream.Length }).ToString();
            }

            int width = 0;
            int height = 0;

            if (mediaFile.MediaType == MediaType.Image)
            {
                var image = Image.FromStream(inputStream);
                width = image.Width;
                height = image.Height;
            }

            if (mediaFile.MediaType == MediaType.Video)
            {
                // Use ImageMetadataReader library to search tags for width and height
                var directories = ImageMetadataReader.ReadMetadata(inputStream);
                foreach (var directory in directories)
                {
                    foreach (var tag in directory.Tags)
                    {
                        if (tag.Name.Contains("width", StringComparison.OrdinalIgnoreCase) && int.TryParse(tag.Description, out var w) && w > 0)
                        {
                            width = w;
                        }
                        if (tag.Name.Contains("height", StringComparison.OrdinalIgnoreCase) && int.TryParse(tag.Description, out var h) && h > 0)
                        {
                            height = h;
                        }
                        if (width > 0 && height > 0)
                        {
                            break;
                        }
                    }
                }
            }

            // return stream to beginning
            inputStream.Position = 0;
            return JObject.FromObject(new { height, width, size = inputStream.Length }).ToString();
        }

        /// <summary>
        /// Resize the image file without distorting aspect ration. Ignores video and webp files.
        /// </summary>
        /// <param name="inputStream">The input <see cref="Stream"/> with file.</param>
        /// <param name="mediaFile">The <see cref="MediaFile"/>.</param>
        /// <param name="width">The desired width pixels.</param>
        /// <param name="height">The desired height in pixels.</param>
        /// <returns>The resized image <see cref="Stream"/>.</returns>
        static Stream ResizeImage(Stream inputStream, MediaFile mediaFile, int width, int height)
        {
            if (mediaFile.Name.EndsWith(".mp4"))
            {
                return inputStream;
            }

            // re: https://imageprocessor.org/imageprocessor/plugins/webp/
            if (mediaFile.Name.EndsWith(".webp"))
            {
                return inputStream;
            }

            var optimizedImage = new MemoryStream();

            // Initialize the ImageFactory using the overload to preserve EXIF metadata.
            using (ImageFactory imageFactory = new ImageFactory(preserveExifData: true))
            {
                imageFactory.Load(inputStream);

                // Reduce file size to max width
                if (imageFactory.Image.Width > width)
                {
                    imageFactory.Resize(new ResizeLayer(new Size(width, height), ResizeMode.Min));
                    imageFactory.Save(optimizedImage);
                    return optimizedImage;
                }
            }

            return inputStream;
        }
    }
}
