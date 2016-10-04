"use strict";

/** Import all required node module */
var fs 		 = require('fs');		// Node module for file system
var request  = require('request');  // Node module for making HTTP request
var cheerio  = require('cheerio');
/**
  Cheerio implements a subset of core jQuery that allow us to traverse the DOM using jQuery familiar syntax.
  This module is actively maintained and is fast and flexible, this is the reason I chose this module.
*/
var json2csv = require('json2csv');
/**
  Converts json into csv with column titles and proper line endings.
  I chose this package because it has many releases and is actively maintained, and also very popular.
*/

/** csv header fields */
var csvFields = ["Title", "Price", "ImageURL", "URL", "Time"];

var data = [],
	shirtArray = [],
	shirtToScrap = [];

var dir = "./data",
	errorFile = 'scraper-error.log',
	url = "http://shirts4mike.com";

/** Make request to index page to get all shirt links */
request(url, function(error, response, body ) {

	/** Request is succesful and there is no error */
	if(!error && response.statusCode === 200) {
		
		/** Create jQuery like object */
		var $ = cheerio.load(body);
		/** Grab all shirt links from the page */
		var shirts = $("a[href*='shirt']");

		/** Traverse all links and store path into shirtArray */
		shirts.each(function() {
			var fullPath = url + '/' + $(this).attr('href');
			if(shirtArray.indexOf(fullPath) === -1) {
				shirtArray.push(fullPath);
			}
		}); // End of shirts.each() method

		/** Loop through shirtArray and get all shirt Links */
		for (var i = 0; i < shirtArray.length; i++) {

			/** Store all links to shirtsToScrap array which has query string id */
			if (shirtArray[i].indexOf("?id=") > 0) {
				shirtToScrap.push(shirtArray[i]);

			} else { 

				/** Make request to "http://shirts4mike.com/shirt.php" page to get additional shirt links */
				request(shirtArray[i], function(error, response, body) {

					/** Request is succesful and there is no error */
					if(!error && response.statusCode === 200) {
						/** Create jQuery like object */
						var $ = cheerio.load(body);
						/** Grab all shirt links from the page which has id */
						var shirts = $("a[href*='shirt.php?id=']");

						/** Traverse all links and store path into shirtArray */
						shirts.each(function() {
							var href = $(this).attr('href');
							var fullPath = url + '/' + href;
								if (shirtToScrap.indexOf(fullPath) === -1) {
									shirtToScrap.push(fullPath);
								}
						}); // End of shirts.each() method

						/** Now we have all shirt links in shirtToScrp array, make request to all links
						 * and get shirt price, image, title, etc
						 */
						for (var i = 0; i < shirtToScrap.length; i++) {

							/** Request to get shirt details */
							request(shirtToScrap[i], function(error, response, body) {

								/** Request is succesful and there is no error */
								if (!error && response.statusCode == 200) { 
									/** Create jQuery like object */
									var $ = cheerio.load(body);

									/** Create an object to hold the shirt detail */
									var json = {}

									json.Title = $('title').text();
									json.Price = $('.price').text();
									json.ImageURL = $('.shirt-picture img').attr('src');
									json.URL = response.request.href;

									var today = new Date();
									json.Time = today; // Time of extraction

									/** Store shirt details into an array */
									data.push(json);
							
									/** Create folder called 'data' if it is not already exists */
									if(!fs.existsSync(dir)) {
										fs.mkdirSync(dir);
									};
									
									/** Create csv file with today's file name */
									var dd = today.getDate();
									var mm = today.getMonth() + 1 ;
									var yyyy = today.getFullYear();
									var csvFileName = yyyy + "-" + dd + "-" + mm + ".csv";
						
									/** Convert json data into csv format using node module json2csv */
									json2csv({data:data, fields:csvFields}, function(err, csv) {

										if (err) throw err;
										/** If the data file for today already exists it should overwrite the file */
										fs.writeFile(dir + "/" + csvFileName, csv, function(err) {
											if (err) throw err;
												console.log(csvFileName + ' created');
										}); //End fo writeFile

									}); // End of json2csv method
								} else {
									printErrorMessage(error);
								} // End of if - request succesful
							}); // End of request method

						} // end of for
					} else {
						printErrorMessage(error);
					} // End of if 
				}); // End of request method
			} // End if
		} // End of for loop
	} else {
		printErrorMessage(error);
	} // End if
}); // End of request method

/**
 * @description Error Handling function
 * @param {object} error
 */
function printErrorMessage(error) {
	console.log('Error occured while scrapping site ' + url);
	var errorMsg = "[" + Date() + "]" + " : " + error + "\n";
	fs.appendFile(errorFile, errorMsg, function(err) {
		if (err) throw err;
		console.log('Error was logged into "scraper-error.log" file');
	});
}
