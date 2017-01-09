var system = require('system');

var Client_Inject_1_Filename = '_client_inject_1.js';

var casper_options = {
	userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10) AppleWebKit/600.1.25 (KHTML, like Gecko) Version/8.0 Safari/600.1.25',
	// userAgent: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
	// verbose: true,
	// logLevel: 'debug',
	// logLevel: 'error',
	pageSettings:
	{
		loadImages: true,
		loadPlugins: true
	},
	clientScripts: [
		// JQuery_js_Filename
		Client_Inject_1_Filename
	],
	viewportSize:
	{
		width: 800,
		height: 1000
	}
};

var casper = require('casper').create(casper_options);
var xpath = require('casper').selectXPath;
var utils = require('utils');
var fs = require('fs');


//=====================================================================
//=====================================================================
//
//		Logging
//
//=====================================================================
//=====================================================================

var Logger = {};

//---------------------------------------------------------------------
Logger.LogTimestamp = false;


//---------------------------------------------------------------------
Logger.GetTimestamp =
	function GetTimestamp()
	{
		var date = new Date();
		var timestamp = date.toISOString(); //"2011-12-19T15:28:46.493Z"
		return timestamp;
	}


//---------------------------------------------------------------------
Logger.LogMessage =
	function LogMessage(Message)
	{
		var head = '========[';
		var tail = '] ' + Message;
		var stats = '';
		if (Logger.LogTimestamp)
		{
			stats += this.GetTimestamp();
		}
		console.log(head + ' ' + stats + ' ' + tail);
		return;
	}


//---------------------------------------------------------------------
Logger.ObjectJson =
	function DebugObject(SomeObject)
	{
		return JSON.stringify(SomeObject, undefined, "    ");
	}


//---------------------------------------------------------------------
Logger.LogObject =
	function LogObject(SomeObject)
	{
		this.LogMessage("\n" + this.ObjectJson(SomeObject));
		return;
	}


//=====================================================================
//=====================================================================
//
//		Casper Events
//
//=====================================================================
//=====================================================================


var LOG_PAGE_ERRORS = false;
var LOG_REMOTE_MESSAGES = false;


//=====================================================================
casper.on("error",
	function(msg, trace)
	{
		Logger.LogMessage("[Error] " + msg);
		Logger.LogMessage("[Error trace] " + JSON.stringify(trace, undefined, 4));
		return;
	});


//=====================================================================
casper.on("run.complete",
	function()
	{
		Logger.LogMessage("CasperJS is stopping.");
		this.exit(0);
		return;
	});


//=====================================================================
casper.on("page.error",
	function(msg, trace)
	{
		if (LOG_PAGE_ERRORS)
		{
			Logger.LogMessage("[Remote Page Error] " + msg);
			Logger.LogMessage("[Remote Error trace] " + JSON.stringify(trace, undefined, 4));
		}
		return;
	});


//=====================================================================
casper.on('remote.message',
	function(msg)
	{
		if (LOG_REMOTE_MESSAGES)
		{
			Logger.LogMessage('[Remote Message] ' + msg);
		}
		return;
	});


//=====================================================================
//=====================================================================
//
//		Casper Wrappers
//
//=====================================================================
//=====================================================================


//=====================================================================
casper.GetAttributeValue = function GetAttributeValue(Selector, AttributeName, Default)
{
	if (!this.exists(Selector))
	{
		return Default;
	}
	return this.getElementAttribute(Selector, AttributeName);
}


//=====================================================================
casper.GetElementText = function GetElementText(Selector)
{
	if (!this.exists(Selector))
	{
		return '';
	}
	return this.fetchText(Selector);
}


SmileCommon_Client_New_ArrayTableCell =
function Client_New_ArrayTableCell( Text )
{ return SmileClient_New_ArrayTableCell( Text ); }

SmileCommon_Client_New_ArrayTable =
function Client_New_ArrayTable()
{ return SmileClient_New_ArrayTable(); }

SmileCommon_Client_Grow_ArrayTable =
function Client_Grow_ArrayTable( ArrayTable, RowCount, ColumnCount )
{ return SmileClient_Grow_ArrayTable( ArrayTable, RowCount, ColumnCount ); }

SmileCommon_Client_HtmlTable_Append_ArrayTable =
function Client_HtmlTable_Append_ArrayTable( HtmlTable, ArrayTable )
{ return SmileClient_HtmlTable_Append_ArrayTable( document.querySelector( HtmlTable ), ArrayTable ); }

SmileCommon_Client_HtmlTable_To_ArrayTable =
function Client_HtmlTable_To_ArrayTable( HtmlTable, SpanCells, FillSpans )
{ return SmileClient_HtmlTable_To_ArrayTable( document.querySelector( HtmlTable ), SpanCells, FillSpans ); }


casper.Scrape_Table = function Scrape_Table( Casper, Selector )
{
	var array_table = null;
	array_table = this.evaluate( SmileCommon_Client_HtmlTable_To_ArrayTable , Selector, true, false );
	
	if( (typeof array_table == 'undefined' ) || (array_table === null) )
	{
		Logger.LogMessage( "WARNING: Missing table [" + Selector + "]." );
		array_table = this.evaluate( SmileCommon_Client_New_ArrayTable );
	}
	
	if( (typeof array_table.Rows == 'undefined' ) || (array_table.Rows === null) )
	{
		Logger.LogMessage( "WARNING: Missing rows for table [" + Selector + "]." );
		Logger.LogMessage( "Sending blank table [" + Selector + "] : " + array_table + "." );
	}
	
	Logger.LogMessage( "Table [" + Selector + "] : " + array_table.Rows.length + " rows." );
	return array_table;
}


//=====================================================================
casper.GetTable = function GetTable(Selector)
{
	if (!this.exists(Selector))
	{
		return '';
	}
	return this.Scrape_Table( Selector, true, false );

// function()
// 		{
// 			return SmileClient_HtmlTable_To_ArrayTable(Selector, false, false);
// 		});
}


//=====================================================================
casper.ClickToDeath = function ClickToDeath(selector, timeout_ms)
{
	this.waitForSelector(selector,
		function OnResource()
		{
			if (this.exists(selector))
			{
				Logger.LogMessage('ClickToDeath [' + selector + ']');
				this.click(selector);
				// this.wait(2000, ClickToDeath(selector));
				this.ClickToDeath(selector);
			}
		},
		function OnTimeout()
		{},
		timeout_ms);

	return;
}


//=====================================================================
casper.GetPageSnapshot = function GetPageSnapshot(SnapshotName, DoSaveImage, DoSaveHtml)
{
	SnapshotName = SnapshotName || 'snapshot';
	DoSaveImage = DoSaveImage || true;
	DoSaveHtml = DoSaveHtml || true;

	if (DoSaveImage)
	{
		this.capture(SnapshotName + '.jpg');
	}
	if (DoSaveHtml)
	{
		fs.write(SnapshotName + '.html', this.getPageContent(), 'w');
	}

	return;
}


//=====================================================================
casper.ExitNow = function ExitNow(Status, Message)
{
	Logger.LogMessage(Message);
	Logger.LogMessage('CASPER WILL NOW EXIT!');
	this.exit(Status);
	this.bypass(99999);
	return;
}


//=====================================================================
//=====================================================================
//
//  ╔╦╗┌─┐┬┌┐┌  ╔═╗─┐ ┬┌─┐┌─┐┬ ┬┌┬┐┬┌─┐┌┐┌
//  ║║║├─┤││││  ║╣ ┌┴┬┘├┤ │  │ │ │ ││ ││││
//  ╩ ╩┴ ┴┴┘└┘  ╚═╝┴ └─└─┘└─┘└─┘ ┴ ┴└─┘┘└┘
//
//=====================================================================
//=====================================================================


Logger.LogMessage('CasperJS is starting.');
casper.start();

var job_data = {};

// {{script_me}}

casper.run(
	function(self)
	{
		fs.write('job_data.json', JSON.stringify(job_data, null, 4), 'w');
		this.exit();
	});
