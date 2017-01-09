//=====================================================================
//=====================================================================
//
//		server.js
//
//=====================================================================
//=====================================================================


process.env['DEBUG'] = 'socket.io* node myapp'; // socket.io logging.

// Includes

var npm_path = require('path');
var npm_fs = require('fs');

var npm_express = require('express');
var npm_http = require('http');
var npm_socketio = require('socket.io');

var npm_string = require('string');

// Settings

var NodeJS_Address = process.env.IP || "0.0.0.0";
var NodeJS_Port = process.env.PORT || 3000;

var ClientFolder = npm_path.resolve(__dirname, 'client');
var ProjectsFolder = npm_path.resolve(__dirname, 'projects');
// var ItemsFolder = npm_path.resolve(__dirname, 'Items');

var ProjectLib = require('./projectlib');
ProjectLib.ProjectsFolder = ProjectsFolder;


// Command Line

if (process.argv.length > 2)
{
	NodeJS_Port = process.argv[2];
}

//=====================================================================
//=====================================================================
//
//		HTTP Server
//
//=====================================================================
//=====================================================================


var ExpressRouter = npm_express();


ExpressRouter.get('/artifact/*',
	function(Request, Response, Next)
	{
		try
		{
			var error_artifact_not_found = Error('Artifact not found.');
			var item_path = Request.params[0];
			var item_paths = item_path.split('/');
			if (item_paths.length != 3)
			{
				throw error_artifact_not_found;
			}
			var project_name = item_paths[0];
			var job_id = item_paths[1];
			var artifact_name = item_paths[2];

			// Load the job file.
			var job_folder = ProjectLib.GetJobFolder(project_name, job_id);
			var job_filename = npm_path.join(job_folder, '_project_job.json');
			if (!npm_fs.existsSync(job_filename))
			{
				throw error_artifact_not_found;
			}
			var file_content = npm_fs.readFileSync(job_filename);
			var project_job = JSON.parse(file_content);

			// Validate that this artifact exists in the job file.
			if (project_job.artifacts.indexOf(artifact_name) < 0)
			{
				throw error_artifact_not_found;
			}

			// Send the artifact.
			var artifact_filename = npm_path.join(job_folder, artifact_name);

			var options = {
				root: '',
				dotfiles: 'deny',
				headers:
				{
					'x-timestamp': Date.now(),
					'x-sent': true
				}
			};
			Response.sendFile(artifact_filename, options,
				function(sendFile_error)
				{
					if (sendFile_error)
					{
						console.log(sendFile_error);
						Response.status(sendFile_error.status).end();
					}
					else
					{
						console.log('Sent artifact:', artifact_filename);
					}
				});
			return;
		}
		catch (catch_error)
		{
			Response.send('[FILE ERROR] ' + catch_error.message);
		}
		Next();
	});


ExpressRouter.use(npm_express.static(ClientFolder));

var HttpServer = npm_http.createServer(ExpressRouter);


//=====================================================================
//=====================================================================
//
//		Socket.IO Connections
//
//=====================================================================
//=====================================================================


// var npm_async = require('async');
var SocketIo = npm_socketio.listen(HttpServer);

var HttpSockets = [];


//=====================================================================
//	Initialize a socket connection.
SocketIo.on('connection',
	function(Socket)
	{

		// ==========================================
		// Register this socket connection.
		HttpSockets.push(Socket);

		// ==========================================
		// Socket disconnection.
		Socket.on('disconnect',
			function()
			{
				HttpSockets.splice(HttpSockets.indexOf(Socket), 1);
			});


		//=====================================================================
		//	List Projects
		Socket.on('project_list_request',
			function()
			{
				try
				{
					var projects = ProjectLib.ListProjects();
					Socket.emit('project_list_response', projects);
				}
				catch (err)
				{
					console.error('Error in [project_list_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	Delete Project
		Socket.on('project_delete_request',
			function(ProjectName)
			{
				try
				{
					ProjectLib.DeleteProject(ProjectName);
					Socket.emit('project_delete_response', ProjectName);
				}
				catch (err)
				{
					console.error('Error in [project_delete_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	List Jobs
		Socket.on('job_list_request',
			function(ProjectName)
			{
				try
				{
					var jobs = ProjectLib.ListJobs(ProjectName);
					Socket.emit('job_list_response', jobs);
				}
				catch (err)
				{
					console.error('Error in [job_list_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	Delete Job
		Socket.on('job_delete_request',
			function(ProjectName, JobID)
			{
				try
				{
					ProjectLib.DeleteJob(ProjectName, JobID);
					Socket.emit('job_delete_response', ProjectName, JobID);
				}
				catch (err)
				{
					console.error('Error in [job_delete_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	Project Open
		Socket.on('project_open_request',
			function(project_name)
			{
				try
				{
					var project_filename = npm_path.join(ProjectsFolder, project_name);
					project_filename = npm_path.join(project_filename, '_project.json');

					var file_bytes = npm_fs.readFileSync(project_filename);
					var project = JSON.parse(file_bytes);

					Socket.emit('project_open_response', project);
				}
				catch (err)
				{
					console.error('Error in [project_open_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	Project Save
		Socket.on('project_save_request',
			function(project)
			{
				try
				{
					// Generate the script.
					// project.project_script = ProjectLib.GenerateScript(project.project_steps);
					project.project_script = '';

					// Save the project file.
					var project_filename = npm_path.join(ProjectsFolder, project.project_name);
					project_filename = npm_path.join(project_filename, '_project.json');
					var file_bytes = JSON.stringify(project, null, 4);
					npm_fs.writeFileSync(project_filename, file_bytes);

					Socket.emit('project_save_response', project);
				}
				catch (err)
				{
					console.error('Error in [project_save_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	Project Compile
		Socket.on('project_compile_request',
			function(project)
			{
				try
				{
					// Generate the script.
					var project_compile = {};
					project_compile.project_name = project.project_name;
					project_compile.project_script = ProjectLib.GenerateScript(project.project_steps);

					Socket.emit('project_compile_response', project_compile);
				}
				catch (err)
				{
					console.error('Error in [project_compile_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	Project Run
		Socket.on('project_run_request',
			function(project)
			{
				try
				{
					// Run the job.
					ProjectLib.RunProject(project,
						function OnStart(ProjectJob)
						{
							// Let the client know that we are working on the request.
							Socket.emit('project_run_response', ProjectJob);
						},
						function OnFinish(ProjectJob)
						{
							// Let the client know that we are done.
							Socket.emit('project_run_finished', ProjectJob);
						});
				}
				catch (err)
				{
					console.error('Error in [project_run_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	Job Open
		Socket.on('job_open_request',
			function(project_name, job_id)
			{
				try
				{
					var job_folder = ProjectLib.GetJobFolder(project_name, job_id);
					if (!npm_fs.existsSync(job_folder))
					{
						throw new Error("Job does not exit.");
					}
					var job_filename = npm_path.join(job_folder, '_project_job.json');
					var file_bytes = npm_fs.readFileSync(job_filename);
					var project_job = JSON.parse(file_bytes);

					Socket.emit('job_open_response', project_job);
				}
				catch (err)
				{
					console.error('Error in [job_open_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


		//=====================================================================
		//	Job Artifact
		Socket.on('job_artifact_request',
			function(project_name, job_id, artifact_name)
			{
				try
				{
					// Create a new artifact.
					var artifact = {};
					artifact.project_name = project_name;
					artifact.job_id = job_id;
					artifact.artifact_name = artifact_name;

					// Load the artifact content.
					var file_content = ProjectLib.GetJobArtifact(project_name, job_id, artifact_name);

					artifact.artifact_content = file_content.toString('base64');


					Socket.emit('job_artifact_response', artifact);
				}
				catch (err)
				{
					console.error('Error in [job_artifact_request]: ', err);
					Socket.emit('server_error', '[SERVER ERROR] ' + err.message);
				}
			});


	});


//=====================================================================
//	Broadcast a message to all connected sockets.
function broadcast(event, data)
{
	HttpSockets.forEach(
		function(socket)
		{
			socket.emit(event, data);
		});
}


//=====================================================================
//=====================================================================
//
//		Run Http Server
//
//=====================================================================
//=====================================================================


//==========================================
// Begin accepting connections.
HttpServer.listen(
	NodeJS_Port, NodeJS_Address,
	function()
	{
		var addr = HttpServer.address();
		console.log("Server listening at", addr.address + ":" + addr.port);
		console.log('Access application here: ' + addr.address + ":" + addr.port + '/index.html');
	});
