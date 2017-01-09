"use strict";

var npm_path = require('path');
var npm_fs = require('fs');
var npm_exec = require('child_process').exec;
var npm_string = require('string');


module.exports = ProjectLib;


function ProjectLib()
{
	return;
}


//---------------------------------------------------------------------
ProjectLib.ProjectsFolder = '';


//---------------------------------------------------------------------
ProjectLib.GetProjectFolder =
	function GetProjectFolder(ProjectName)
	{
		var project_folder = npm_path.join(ProjectLib.ProjectsFolder, ProjectName);
		return project_folder;
	}


//---------------------------------------------------------------------
ProjectLib.GetJobFolder =
	function GetJobFolder(ProjectName, JobID)
	{
		var project_folder = ProjectLib.GetProjectFolder(ProjectName);
		var job_folder = npm_path.join(project_folder, 'job.' + JobID);
		return job_folder;
	}


//---------------------------------------------------------------------
ProjectLib.ListProjects =
	function ListProjects()
	{
		var projects = [];
		npm_fs.readdirSync(ProjectLib.ProjectsFolder).forEach(
			function(entry_name)
			{
				projects.push(entry_name);
			});
		return projects;
	}


//---------------------------------------------------------------------
ProjectLib.ListJobs =
	function ListJobs(ProjectName)
	{
		var jobs = [];
		var project_folder = ProjectLib.GetProjectFolder(ProjectName);
		if (npm_fs.existsSync(project_folder))
		{
			var entries = npm_fs.readdirSync(project_folder);
			for (var index = 0; index < entries.length; index++)
			{
				var entry = entries[index];
				if (entry.indexOf('job.') == 0)
				{
					entry = entry.slice(4);
					jobs.push(entry);
				}
			}
		}
		return jobs;
	}


//---------------------------------------------------------------------
var DeleteFolderRecursive = function(path)
{
	if (npm_fs.existsSync(path))
	{
		npm_fs.readdirSync(path).forEach(
			function(file, index)
			{
				var curPath = path + "/" + file;
				if (npm_fs.lstatSync(curPath).isDirectory())
				{ // recurse
					DeleteFolderRecursive(curPath);
				}
				else
				{ // delete file
					npm_fs.unlinkSync(curPath);
				}
			});
		npm_fs.rmdirSync(path);
	}
};


//---------------------------------------------------------------------
ProjectLib.DeleteProject =
	function DeleteProject(ProjectName)
	{
		var project_folder = ProjectLib.GetProjectFolder(ProjectName);
		// if (npm_fs.existsSync(project_folder))
		// {
		// 	npm_fs.unlinkSync(project_folder);
		// }
		DeleteFolderRecursive(project_folder);
		return;
	}


//---------------------------------------------------------------------
ProjectLib.DeleteJob =
	function DeleteJob(ProjectName, JobID)
	{
		var job_folder = ProjectLib.GetJobFolder(ProjectName, JobID);
		// if (npm_fs.existsSync(job_folder))
		// {
		// 	npm_fs.unlinkSync(job_folder);
		// }
		DeleteFolderRecursive(job_folder);
		return;
	}


//---------------------------------------------------------------------
ProjectLib.ScriptError_SyntaxError =
	function ScriptError_SyntaxError(LineNumber, Message)
	{
		return new Error("Syntax error on line " + LineNumber + ". " + Message);
	}


//---------------------------------------------------------------------
ProjectLib.ScriptError_InvalidParameters =
	function ScriptError_InvalidParameters(LineNumber, Command)
	{
		return new Error("Parameter error on line " + LineNumber + ". Invalid parameters for the [" + Command + "] command.");
	}


//---------------------------------------------------------------------
ProjectLib.ParseTimeout =
	function ParseTimeout(TimeoutText)
	{
		var text = npm_string(TimeoutText).trim().collapseWhitespace();
		var quantity = text.toFloat();
		if (isNaN(quantity))
		{
			return null;
		}
		var ich = text.indexOf(' ');
		if (ich >= 0)
		{
			var timespan = text.right(text.length - (ich + 1)).toLowerCase();
			if (!timespan || (timespan == 'milliseconds') || (timespan == 'ms'))
			{
				quantity = quantity * 1;
			}
			else if ((timespan == 'seconds') || (timespan == 's'))
			{
				quantity = quantity * 1000;
			}
			else
			{
				return null;
			}
		}
		return quantity;
	}


//---------------------------------------------------------------------
ProjectLib.GenerateScript =
	function GenerateScript(ProjectSteps)
	{
		var code = '';
		var log_head_top = '====== ';
		// var log_head_major = '->->-> ';
		var log_head_major = '    -> ';
		var log_head_minor = '       ';
		var log_head_pass = ' PASS  ';
		var log_head_fail = ' FAIL  ';

		// Convert string to an array of lines.
		var step_lines = npm_string(ProjectSteps).lines();

		// Iterate through lines.
		for (var line_index = 0; line_index < step_lines.length; line_index++)
		{
			var step = npm_string(step_lines[line_index]).trim();

			// Check for blank lines.
			if (step.length == 0)
			{
				continue;
			}

			// Document the step.
			code += "\n";
			code += "//=====================================================================\n";
			code += "// " + step + "\n";

			// Check for comment lines.
			if (step.startsWith('#'))
			{
				continue;
			}

			// Escape all the single quotes.
			step = step.replaceAll("'", "\\\'");

			// Log the step.
			code += "casper.then( function() { Logger.LogMessage( '" + log_head_top + "Executing step [" + step.toString() + "].' ); } );\n";

			// Get the command and the parameters.
			var ich = step.indexOf(':');
			if (ich < 0)
			{
				throw ProjectLib.ScriptError_SyntaxError(line_index + 1, "Missing ':'.");
			}
			var command = step.left(ich).trim();
			step = step.right(step.length - (ich + 1)).trim();
			var params = step.split('|');

			// Generate the command script.

			//=====================================================================
			//	Debug Command
			if (command == 'debug')
			{

				var value = false;
				if (params.length == 1)
				{
					value = npm_string(params[0]).trim().toBoolean();
				}
				else if (params.length > 1)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}

				if (value)
				{
					code += "\n";
					code += "casper.then(\n";
					code += "    function()\n";
					code += "    {\n";
					code += "        casper.options.logLevel = 'debug';\n";
					code += "        casper.options.verbose = true;\n";
					code += "        LOG_PAGE_ERRORS = true;\n";
					code += "        LOG_REMOTE_MESSAGES = true;\n";
					code += "        Logger.LogTimestamp = true;\n";
					code += "    });\n";
				}
				else
				{
					code += "\n";
					code += "casper.then(\n";
					code += "    function()\n";
					code += "    {\n";
					code += "        casper.options.logLevel = 'error';\n";
					code += "        casper.options.verbose = false;\n";
					code += "        LOG_PAGE_ERRORS = false;\n";
					code += "        LOG_REMOTE_MESSAGES = false;\n";
					code += "        Logger.LogTimestamp = false;\n";
					code += "    });\n";
				}

			}

			//=====================================================================
			//	Url Command
			else if (command == 'url')
			{

				if (params.length != 1)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var url = npm_string(params[0]).trim();
				code += "\n";
				code += "casper.thenOpen(\n";
				code += "    '" + url.toString() + "',\n";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_minor + "Opened Url [" + url.toString() + "].' );\n";
				code += "    });\n";

			}

			//=====================================================================
			//	WaitFor Command
			else if (command == 'waitfor')
			{

				var selector = '';
				var timeout = '';
				if (params.length == 1)
				{
					timeout = ProjectLib.ParseTimeout(params[0]);
					if (!timeout)
					{
						selector = npm_string(params[0]).trim().collapseWhitespace();
					}
				}
				else if (params.length == 2)
				{
					selector = npm_string(params[0]).trim().collapseWhitespace();
					timeout = ProjectLib.ParseTimeout(params[1]);
					if (!timeout)
					{
						throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
					}
				}

				if (!selector && !timeout)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				else if (selector && timeout)
				{
					code += "\n";
					code += "casper.waitForSelector(\n";
					code += "    '" + selector.toString() + "',\n";
					code += "    function()\n";
					code += "    {\n";
					code += "        Logger.LogMessage( '" + log_head_pass + "Wait for selector [" + selector.toString() + "] succeeded.' );\n";
					code += "    },\n";
					code += "    function()\n";
					code += "    {\n";
					code += "        Logger.LogMessage( '" + log_head_fail + "Wait for selector [" + selector.toString() + "] failed after [" + timeout.toString() + "] milliseconds.' );\n";
					code += "    },\n";
					code += "    " + timeout.toString() + " );\n";
				}
				else if (selector)
				{
					code += "\n";
					code += "casper.waitForSelector(\n";
					code += "    '" + selector.toString() + "',\n";
					code += "    function()\n";
					code += "    {\n";
					code += "        Logger.LogMessage( '" + log_head_pass + "Wait for selector [" + selector.toString() + "] succeeded.' );\n";
					code += "    },\n";
					code += "    function()\n";
					code += "    {\n";
					code += "        Logger.LogMessage( '" + log_head_fail + "Wait for selector [" + selector.toString() + "] failed.' );\n";
					code += "    });\n";
				}
				else if (timeout)
				{
					code += "\n";
					code += "casper.wait(\n";
					code += "    " + timeout.toString() + ",\n";
					code += "    function()\n";
					code += "    {\n";
					code += "        Logger.LogMessage( '" + log_head_pass + "Waited for [" + timeout.toString() + "] milliseconds.' );\n";
					code += "    });\n";
				}

			}

			//=====================================================================
			//	SendText Command
			else if (command == 'sendtext')
			{

				if (params.length != 2)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var selector = npm_string(params[0]).trim();
				var text = npm_string(params[1]).trim();
				// text = text.replaceAll("'", "\\\'");

				code += "\n";
				code += "casper.then(\n";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_major + "Sending text [" + text.toString() + "] to selector [" + selector.toString() + "].' );\n";
				code += "        casper.sendKeys( '" + selector.toString() + "', '" + text.toString() + "', { keepFocus: true } );\n";
				code += "    });\n";

			}

			//=====================================================================
			//	SendKey Command
			else if (command == 'sendkey')
			{
				if (params.length != 2)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var selector = npm_string(params[0]).trim();
				var key_code = '';
				var modifiers = '';
				var keys = npm_string(params[1]).split('+');
				keys.forEach(
					function(key)
					{
						key = npm_string(key).trim();
						var lkey = key.toLowerCase();
						if ((lkey == 'ctl') || (lkey == 'ctrl'))
						{
							if (modifiers)
							{
								modifiers += '+';
							}
							modifiers += "ctrl";
						}
						else if (lkey == 'alt')
						{
							if (modifiers)
							{
								modifiers += '+';
							}
							modifiers += "alt";
						}
						else if (lkey == 'shift')
						{
							if (modifiers)
							{
								modifiers += '+';
							}
							modifiers += "shift";
						}
						else
						{
							key_code = key;
						}
					});

				if (!key_code)
				{
					throw ProjectLib.ScriptError_SyntaxError(line_index + 1, "Missing key code.");
				}

				if (modifiers)
				{
					modifiers = ", modifiers: '" + modifiers + "'";
				}

				//NOTE: Key codes are listed here: https://github.com/ariya/phantomjs/commit/cab2635e66d74b7e665c44400b8b20a8f225153a

				code += "\n";
				code += "casper.then(\n";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_major + "Sending key [" + key_code + "] to selector [" + selector.toString() + "].' );\n";
				code += "        casper.sendKeys( '" + selector.toString() + "', casper.page.event.key['" + key_code + "'], { keepFocus: true" + modifiers.toString() + " } );\n";
				code += "    });\n";

			}

			//=====================================================================
			//	Click Command
			else if (command == 'click')
			{

				if (params.length != 1)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var selector = npm_string(params[0]).trim();

				code += "\n";
				code += "casper.thenClick(\n";
				code += "    '" + selector.toString() + "'";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_major + "Clicked [" + selector.toString() + "].' );\n";
				code += "    });\n";

			}

			//=====================================================================
			//	ScrapeText Command
			else if (command == 'scrapetext')
			{

				if (params.length != 2)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var selector = npm_string(params[0]).trim();
				var variable = npm_string(params[1]).trim();

				code += "\n";
				code += "casper.then(\n";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_major + "Scraping text from [" + selector.toString() + "].' );\n";
				code += "        job_data." + variable.toString() + " = casper.fetchText( '" + selector.toString() + "' );";
				code += "    });\n";

			}

			//=====================================================================
			//	ScrapeArray Command
			else if (command == 'scrapevalue')
			{

				if (params.length != 3)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var selector = npm_string(params[0]).trim();
				var attribute = npm_string(params[1]).trim();
				var variable = npm_string(params[2]).trim();

				code += "\n";
				code += "casper.then(\n";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_major + "Scraping value from [" + selector.toString() + " | " + attribute.toString() + "].' );\n";
				code += "        job_data." + variable.toString() + " = casper.getElementAttribute( '" + selector.toString() + "', '" + attribute.toString() + "' );";
				code += "    });\n";

			}

			//=====================================================================
			//	ScrapeArray Command
			else if (command == 'scrapearray')
			{

				if (params.length != 3)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var selector = npm_string(params[0]).trim();
				var attribute = npm_string(params[1]).trim();
				var variable = npm_string(params[2]).trim();

				code += "\n";
				code += "casper.then(\n";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_major + "Scraping array from [" + selector.toString() + " | " + attribute.toString() + "].' );\n";
				code += "        job_data." + variable.toString() + " = casper.getElementsAttribute( '" + selector.toString() + "', '" + attribute.toString() + "' );";
				code += "    });\n";

			}

			//=====================================================================
			//	ScrapeTable Command
			else if (command == 'scrapetable')
			{

				if (params.length != 2)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var selector = npm_string(params[0]).trim();
				var variable = npm_string(params[1]).trim();

				code += "\n";
				code += "casper.then(\n";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_major + "Scraping table from [" + selector.toString() + "].' );\n";
				code += "        job_data." + variable.toString() + " = casper.GetTable( '" + selector.toString() + "' );";
				code += "    });\n";

			}

			//=====================================================================
			//	Snapshot Command
			else if (command == 'snapshot')
			{

				if (params.length != 1)
				{
					throw ProjectLib.ScriptError_InvalidParameters(line_index + 1, command.toString());
				}
				var snapshotname = npm_string(params[0]).trim();

				code += "\n";
				code += "casper.then(\n";
				code += "    function()\n";
				code += "    {\n";
				code += "        Logger.LogMessage( '" + log_head_major + "Saving snapshot [" + snapshotname.toString() + "].' );\n";
				code += "        casper.GetPageSnapshot( '" + snapshotname.toString() + "', true, true );\n";
				code += "    });\n";

			}

			//=====================================================================
			//	Unknown Command
			else
			{
				throw ProjectLib.ScriptError_SyntaxError(line_index + 1, "Unknown command [" + command + "].");
			}

		}

		code += "\n";
		return code;
	}


//---------------------------------------------------------------------
ProjectLib.RunProject =
	function RunProject(Project, OnStartCallback, OnFinishCallback)
	{

		// Create a new job.
		var project_job = {};
		project_job.job_id = Date.now();
		project_job.time_started = project_job.job_id;
		project_job.project_name = Project.project_name;
		project_job.project_steps = Project.project_steps;

		// Generate the script.
		project_job.project_script = ProjectLib.GenerateScript(project_job.project_steps);

		// Initialize the job folder.
		var job_folder = ProjectLib.GetJobFolder(project_job.project_name, project_job.job_id);
		if (npm_fs.existsSync(job_folder))
		{
			npm_fs.unlinkSync(job_folder);
		}
		npm_fs.mkdirSync(job_folder);

		// Make an initial save of the job.
		var project_job_filename = npm_path.join(job_folder, '_project_job.json');
		npm_fs.writeFileSync(project_job_filename, JSON.stringify(project_job, null, 4));

		// Notify that we are starting.
		OnStartCallback(project_job);

		// Load the script template and inject the project script.
		var template = npm_fs.readFileSync('engines/casperjs/script_template.js');
		var script = npm_string(template);
		script = '' + script.replace('// {{script_me}}', project_job.project_script);
		var script_filename = npm_path.join(job_folder, '_project_script.js');
		npm_fs.writeFileSync(script_filename, script);

		// Make sure the client dependencies exist.
		var file_content = npm_fs.readFileSync('engines/casperjs/_client_inject_1.js');
		var client_script_filename = npm_path.join(job_folder, '_client_inject_1.js');
		npm_fs.writeFileSync(client_script_filename, file_content);

		// Execute.
		var command = 'casperjs ' + script_filename;
		var options = {};
		options.cwd = job_folder;
		npm_exec(command, options,
			function(error, stdout, stderr)
			{
				// Mark the completion time.
				project_job.time_finished = Date.now();
				project_job.seconds_elapsed = (project_job.time_finished - project_job.time_started) / 1000;

				// Collect the output
				project_job.stdout = stdout;
				project_job.stderr = stderr;

				// List the artifacts.
				project_job.artifacts = [];
				npm_fs.readdirSync(job_folder).forEach(
					function(entry_name)
					{
						if ((entry_name != '_project_script.js') &&
							(entry_name != '_project_job.json') &&
							(entry_name != '_client_inject_1.js'))
						{
							project_job.artifacts.push(entry_name);
						}
					});

				// Save the job.
				npm_fs.writeFileSync(project_job_filename, JSON.stringify(project_job, null, 4));

				// Call the callback function.
				OnFinishCallback(project_job);
			});

		return;
	}


//---------------------------------------------------------------------
ProjectLib.GetJobArtifact =
	function GetJobArtifact(ProjectName, JobID, ArtifactName)
	{
		var job_folder = ProjectLib.GetJobFolder(ProjectLib.ProjectsFolder, ProjectName, JobID);
		var filename = npm_path.join(job_folder, ArtifactName);
		var file_contents = npm_fs.readFileSync(filename);
		file_contents = npm_string(file_contents);
		return file_contents.toString();
	}
