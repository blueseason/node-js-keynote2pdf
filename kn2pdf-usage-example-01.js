/*	kn2pdf-usage-example-01.js

	Basic example with no error check and the strict minimum calls for handling files

	Reminder:
		(1) This server *must* run on Mac
	and (2) the Mac *must* have Keynote installed.

	A way to test it using curl:
	curl --upload-file "/path/to/the/presentation.zip" http://localhost:1337 -o "path/to/the_resultPdf.pdf"

*/
var http = require('http');
var fs = require("fs"); // We handle files, don't we?
var os = require("os"); // For storing the received zip in a temporary folder
var keynote2pdf = require("./keynote2pdf");

function oc(a){
    var o = {};
    for(var i=0;i<a.length;i++) {
        o[a[i]]='';
        }
    return o;
}
// In this example, the server expects to receive only zipped files, there is
// no handler to dispatch the request, etc.

// -------------------------------------------------------------------------
// (1) Declare the temporary folder where we will store the zips
// -------------------------------------------------------------------------
var gDestTempFolder = os.tmpDir() + "MyAppReceivedZips/";
if(!fs.existsSync(gDestTempFolder)) {
	fs.mkdirSync(gDestTempFolder);
}
// This vartiable is used to create "unique" names
// WARNING: Only unqiue during this session
var gCount = 0;
http.createServer(function(request, response) {
	var destZipFile, destFileStream;

    console.log("http url is %s",request.url);
    var extensionAllowed = [".key",".pages",".numbers"];
    extensionAllowed = oc(extensionAllowed);
    var i = request.url.lastIndexOf(".");
    var fileExt = (i<0)? '': request.url.substr(i);
    console.log("ext is %s", fileExt);
    if(fileExt in extensionAllowed) {
// -------------------------------------------------------------------------
// (2) Get the file sent by the client
// -------------------------------------------------------------------------
	destZipFile = os.tmpDir() + gCount + fileExt;
	destFileStream = fs.createWriteStream(destZipFile);
	request.pipe(destFileStream);
// -------------------------------------------------------------------------
// (3) Once the file is received, convert it
// -------------------------------------------------------------------------
	request.on('end',function(){
            console.log("save recv file is done");
		keynote2pdf.convert(destZipFile, fileExt,function(inError, inData) {
			var readStream;
// -------------------------------------------------------------------------
// (4a) If we have an error, stop everything
// -------------------------------------------------------------------------
			if(inError) {
				console.log("Got an error: " + inError);
				response.writeHead(500, {'Content-Type': 'text/plain'});
				response.end("Got an error: " + inError);
				// Delete our zip
				fs.unlinkSync(destZipFile);
			} else {
				// Just for this example, let's log the steps
				console.log(JSON.stringify(inData));
// -------------------------------------------------------------------------
// (4b) If we have no error, then return the pdf if we have it
// -------------------------------------------------------------------------
				if(inData.step === keynote2pdf.k.STEP_DONE) {
					readStream = fs.createReadStream(inData.pdf);
				// When the stream is ready, send the data to the client
					readStream.on('open', function () {
					// This pipe() API is amazing ;-)
/*                        response.writeHead(200, {
                              'Content-Length': fs.statSync(inData.pdf).size,
                              'Content-Type': 'application/octet-stream' });*/
						readStream.pipe(response);
					});
				// When all is done with no problem, do some cleanup
					readStream.on('end', function () {
					// Tell keynote2pdf the temporary files used for this conversion
					// can be cleaned up
						keynote2pdf.canClean(inData.uid);
					// Do our own cleanup and delete the zip
						fs.unlinkSync(destZipFile);
					});
				// In case of error, also do some cleanup
					readStream.on('error', function (inErr) {
						console.log("readStream -> error: " + inErr);
						response.end(inError);
						keynote2pdf.canClean(inData.uid);
						fs.unlinkSync(destZipFile);
					});
				// We don't use this one
					/*
					readStream.on('data', function (chunk) {
						console.log('got %d bytes of data', chunk.length);
					});
					*/
				}
			}
		}); // keynote2pdf.convert
	}); // request.on('end'...)
    }
}).listen(1337, "192.168.44.131", function(){
	console.log("node server started, listening on localhost:1337");
});

// -- EOF--
