using Geotab.Checkmate;
using System;
using System.IO;
using System.Threading.Tasks;


namespace MediaFiles
{
    class Program
    {
        /// <summary>
        /// This application serves as an example of interacting with <see cref="MediaFile"/> objects which represent some form of binary media.
        /// The example illustrates:
        ///
        /// 1) Process command line arguments: Server, Database, Username, Password and InputFile. Accepts .jpg, .png, .gif, .webp, .mp4 file formats.
        /// 2) Create Geotab API object and Authenticate.
        /// 3) Adding a MediaFile object.
        /// 4) Using a third-party library to resize image binaries.
        /// 4) Uploading MediaFile binary data.
        /// 5) Updating a MediaFile object with meta-data.
        /// 6) Downloading MediaFile binary data.
        ///
        /// A complete Geotab API object and method reference is available at the Geotab Developer page.
        /// </summary>
        /// <param name="args">The command line arguments for the application. Note: When debugging these can be added by: Right click the project > Properties > Debug Tab > Start Options: Command line arguments.</param>
        static async Task Main(string[] args)
        {
            try
            {
                if (args.Length < 5)
                {
                    Console.WriteLine();
                    Console.WriteLine("Command line parameters:");
                    Console.WriteLine("dotnet run <server> <database> <username> <password> <inputfile>");
                    Console.WriteLine();
                    Console.WriteLine("Command line:      dotnet run server database username password inputfile");
                    Console.WriteLine("server             - The server name (Example: my.geotab.com)");
                    Console.WriteLine("database           - The database name (Example: G560)");
                    Console.WriteLine("username           - The Geotab user name");
                    Console.WriteLine("password           - The Geotab password");
                    Console.WriteLine("inputfile          - Full path name of the file to upload [.jpg,.png,.gif,.webp,.mp4].");
                    Console.WriteLine();
                    return;
                }

                // Variables from command line
                int last = args.Length - 1;
                string server = args[0];
                string database = args[1];
                string username = args[2];
                string password = args[3];
                string inputfile = args[last];

                // -- Validate the input file
                var file = new FileInfo(inputfile);
                if (!file.Exists)
                {
                    throw new FileNotFoundException(inputfile);
                }

                // -- Create Geotab API object and authenticate
                var api = new API(username, password, null, database, server);

                Console.WriteLine("Authenticating...");

                await api.AuthenticateAsync();

                Console.WriteLine($"Authenticating complete.{Environment.NewLine}");

                var example = new MediaFileExample(api);
                await example.Run(file);

            }
            catch (Exception ex)
            {
                // Show miscellaneous exceptions
                Console.WriteLine($"Error: {ex.Message}\n{ex.StackTrace}");
            }
            finally
            {
                Console.WriteLine("Press any key to continue...");
                Console.ReadKey(true);
            }
        }
    }
}
