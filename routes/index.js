var express = require('express');
var router = express.Router();
var WordExtractor = require("word-extractor");
var extractor = new WordExtractor();
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');

var fileName = '';

var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient({
	accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_ID,
	region: process.env.REGION
});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'HUB'});
});

router.post('/upload', function(req, res, next) {
	var form = new formidable.IncomingForm();

  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;

  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '../');

  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  form.on('file', function(field, file) {
  	fileName = file.name;
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });

  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.redirect('/upload');
  });

  // parse the incoming request containing the form data
  //form.parse(req);
});

router.get('/upload', function(req, res, next) {
	var extracted = extractor.extract(fileName);
	extracted.then(function(doc) {
	  var text = doc.getBody();
	  text = text.replace(/\r?\n|\r/g, " ");
	  //console.log(text);
	  var arr = ['Quote Request For:', 'Requested Effective Date:', 'Plans:', 'Deductible:', 'Proposed Insured:', 'Address:', 'Contact:', 
	  'Phone #:', 'Nature of Business:', 'SIC #⇒:', 'FEIN:', 'Type of Business:', 'Employer Contributes:', 'Wait Period For New Hires:', 
	  'Eligible Employees Must Work:', 'CURRENT PLAN & RATE INFORMATION:', 'PLEASE NOTE:', 'CURRENT RATES',
	  [['', 'CURRENT RATES','RENEWAL RATES'], ['Employee (EE):', 'EE + Spouse:', 'EE + Child(ren)', 'EE + Family:']],
	  [['', 'PRIOR RATES (1)', 'PRIOR RATES (2)'], ['Employee (EE):', 'EE + Spouse:', 'EE + Child(ren)', 'EE + Family:']], 'Total Number Of Employees In Employment Force:',
	  'Total Number Of Part-Time, Temporary, Seasonal Employees or Not Eligible (contracted employee):', 'Total Number Of Newly-Hired Employees In Wait Period:', 
	  'Total Number Of Employees Declining Coverage with other coverage:', 'Total Number Of Employees Declining Coverage without coverage:', 
	  'Total Number Of Employees Expected To Enroll:', 'Total Number Of COBRA Participants:', 'ADDITIONAL NOTES:', 'END_OF_FILE'];
	  var result = {};
	  for(var i=0; i<arr.length; i++){
	  	//while(arr[i] != 'END_OF_FILE'){
	  	if(arr[i+1] != undefined){
	  		//console.log(typeof arr[i])
	  		if(typeof(arr[i]) == "object"){
	  			//console.log(arr[i]);
	  			//result
	  		}else{
	  			var regExString = new RegExp("(?:"+arr[i]+")(.*?)(?:"+arr[i+1]+")", "ig"); 
					var testRE = regExString.exec(text);
		  		if (testRE && testRE.length > 1){
		  			var key = arr[i].replace(/\s/g, '');
		  			key = key.replace(/\:/g, '');
		  			console.log(key)
		  			result[key] = testRE[1].trim();
			  		//console.log(arr[i], testRE[1]);
			  	}else{
			  		result[arr[i]] = null;
			  		//console.log(arr[i], testRE);
			  	}
	  		}
			}
	  }
	  JSON.stringify(result);
	  console.log(result);
	  res.render('index', { title: 'HUB', data: result});
	});
});

router.post('/save', function(req, res, next) {
	var tableData = {
		TableName: 'records',
		Item: {

		}
	};
  dynamo.put(tableData, function(err, data){
		if(err){
			callback(err, null);
		}else{
			callback(null, data);
		}
	});
});


module.exports = router;
