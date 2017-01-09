/* global $ */
/* global io */
/* global angular */
/* global ace */
/* global showdown */


var app = angular.module('DreamScrapeApp', []);


app.controller('StepController',
	function StepController($scope)
	{
		var socket = io.connect();

		$.get("help_text.md",
			function(data)
			{
				var converter = new showdown.Converter();
				var html = converter.makeHtml(data);
				$('div#help_text').html(html);
			});

		//==========================================
		//	Project Steps Editor
		//==========================================

		var project_steps_editor = ace.edit("project_steps_editor");

		// project_steps_editor.getSession().setMode("ace/mode/ini");
		// project_steps_editor.session.$mode.$highlightRules.setKeywords({"keyword": "url|waitfor|sendtext"})

		// project_steps_editor.setTheme("ace/theme/monokai");
		// project_steps_editor.setTheme("ace/theme/pastel_on_dark");
		// project_steps_editor.setTheme("ace/theme/solarized_dark");
		project_steps_editor.setTheme("ace/theme/clouds_midnight");
		$("#project_steps_editor").css("fontSize", "16px");

		// project_steps_editor.getSession().setMode("ace/mode/javascript");

		project_steps_editor.commands.addCommand(
		{
			name: 'Save',
			bindKey:
			{
				win: 'Ctrl-S',
				mac: 'Command-S'
			},
			exec: function(editor)
			{
				$scope.project_save_request();
			}
		});

		project_steps_editor.getSession().on('change',
			function(e)
			{
				window.onbeforeunload = function()
				{
					return 'You have unsaved changes.'
				}
			});


		//==========================================
		//	Project Script Viewer
		//==========================================

		var current_job_project_script = ace.edit("current_job_project_script");
		current_job_project_script.setReadOnly(true);
		current_job_project_script.getSession().setMode("ace/mode/javascript");

		var current_job_stdout = ace.edit("current_job_stdout");
		current_job_stdout.setReadOnly(true);
		// current_job_stdout.getSession().setMode("ace/mode/javascript");

		var current_job_stderr = ace.edit("current_job_stderr");
		current_job_stderr.setReadOnly(true);
		// current_job_stderr.getSession().setMode("ace/mode/javascript");

		// project_script_viewer.setTheme("ace/theme/monokai");
		// project_script_viewer.setTheme("ace/theme/pastel_on_dark");
		// project_script_viewer.setTheme("ace/theme/solarized_dark");
		// project_script_viewer.setTheme("ace/theme/clouds_midnight");

		var project_job_project_script = ace.edit("project_job_project_script");
		project_job_project_script.setReadOnly(true);
		project_job_project_script.getSession().setMode("ace/mode/javascript");



		//==========================================
		//	Socket.IO Messages
		//==========================================


		// ==========================================
		socket.on('connect', function()
		{
			$scope.notice = "... connected ... ready to start dreaming ...";
			$scope.$apply();
		});


		// ==========================================
		socket.on('server_error', function(server_error)
		{
			console.log('> server_error', server_error);
			$scope.errors.push(server_error);

			$scope.$apply();
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Project List
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.project_list_request = function project_list_request()
		{
			$scope.notice = "Listing projects.";
			$scope.errors = [];
			$scope.project_list = [];
			socket.emit('project_list_request');
			return;
		};


		// ==========================================
		socket.on('project_list_response', function(projects)
		{
			$scope.notice = "Listed [" + projects.length + "] projects.";
			$scope.project_list = projects;
			$scope.$apply();
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Project Open
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.project_open_request = function project_open_request(project_name)
		{
			$scope.notice = "Opening project [" + project_name + "].";
			$scope.errors = [];
			$scope.last_project_steps = '';
			$scope.project_job = null;

			socket.emit('project_open_request', project_name);
			return;
		};


		// ==========================================
		socket.on('project_open_response', function(project)
		{
			$scope.notice = "Opened project [" + project.project_name + "].";
			$scope.project_name = project.project_name;
			$scope.last_project_steps = project.project_steps;
			project_steps_editor.setValue(project.project_steps);
			project_steps_editor.clearSelection();
			$scope.project_job = null;
			$scope.$apply();
			window.onbeforeunload = null;
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Project Save
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.project_save_request = function project_save_request()
		{
			$scope.notice = "Saving project [" + $scope.project_name + "].";
			$scope.errors = [];

			var project = {};
			project.project_name = $scope.project_name;
			// project.project_steps = $scope.project_steps;
			project.project_steps = project_steps_editor.getValue();
			socket.emit('project_save_request', project);
			return;
		};


		// ==========================================
		socket.on('project_save_response', function(project)
		{
			$scope.notice = "Saved project [" + project.project_name + "].";
			$scope.project_name = project.project_name;
			$scope.last_project_steps = project.project_steps;
			$scope.$apply();
			window.onbeforeunload = null;
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Project Compile
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.project_compile_request = function project_compile_request()
		{
			$scope.notice = "Compiling project [" + $scope.project_name + "].";
			$scope.errors = [];
			$scope.current_job = null;

			var project = {};
			project.project_name = $scope.project_name;
			// project.project_steps = $scope.project_steps;
			project.project_steps = project_steps_editor.getValue();
			socket.emit('project_compile_request', project);
			return;
		};


		// ==========================================
		socket.on('project_compile_response', function(project_compile)
		{
			$scope.notice = "Project compiled [" + project_compile.project_name + "].";

			$scope.current_job = {};
			$scope.current_job.project_name = project_compile.project_name;
			$scope.current_job.project_script = project_compile.project_script;

			current_job_project_script.setValue(project_compile.project_script);
			current_job_project_script.clearSelection();

			$scope.$apply();
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Project Run
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.project_run_request = function project_run_request()
		{
			$scope.notice = "Starting project [" + $scope.project_name + "].";
			$scope.errors = [];
			$scope.current_job = null;

			var project = {};
			project.project_name = $scope.project_name;
			project.project_steps = project_steps_editor.getValue();
			socket.emit('project_run_request', project);
			return;
		};


		// ==========================================
		socket.on('project_run_response', function(project_job)
		{
			$scope.notice = "Running project [" + project_job.project_name + "].";
			$scope.current_job = project_job;

			current_job_project_script.setValue(project_job.project_script);
			current_job_project_script.clearSelection();

			$scope.$apply();
			$scope.job_list_request($scope.project_name);
			return;
		});


		// ==========================================
		socket.on('project_run_finished', function(project_job)
		{
			$scope.notice = "Finished project [" + project_job.project_name + "]";
			$scope.current_job = project_job;

			current_job_stdout.setValue(project_job.stdout);
			current_job_stdout.clearSelection();

			current_job_stderr.setValue(project_job.stderr);
			current_job_stderr.clearSelection();

			current_job_project_script.setValue(project_job.project_script);
			current_job_project_script.clearSelection();

			$scope.$apply();
			$scope.job_list_request($scope.project_name);
			// $('#job_view_modal').modal('show');
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Job List
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.Milliseconds2Datetime = function Milliseconds2Datetime(Milliseconds)
		{
			var date = new Date();
			date.setTime(Milliseconds);
			if (!date.getYear())
			{
				return '';
			}
			var text =
				date.getFullYear() + "-" +
				("00" + (date.getMonth() + 1)).slice(-2) + "-" +
				("00" + date.getDate()).slice(-2) + " -- " +
				("00" + date.getHours()).slice(-2) + ":" +
				("00" + date.getMinutes()).slice(-2) + ":" +
				("00" + date.getSeconds()).slice(-2)
				// ("000" + date.getMilliseconds()).slice(-3)
			return text;
		};


		// ==========================================
		$scope.job_list_request = function job_list_request(project_name)
		{
			$scope.notice = "Listing jobs for [" + project_name + "].";
			$scope.errors = [];
			$scope.job_list = null;
			socket.emit('job_list_request', project_name);
			return;
		};


		// ==========================================
		socket.on('job_list_response', function(jobs)
		{
			$scope.notice = "Listed [" + jobs.length + "] jobs.";
			$scope.job_list = jobs.reverse();
			$scope.$apply();
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Job Open
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.job_open_request = function job_open_request(project_name, job_id)
		{
			$scope.notice = "Opening job [" + project_name + ":" + job_id + "].";
			$scope.errors = [];
			$scope.project_job = null;
			socket.emit('job_open_request', project_name, job_id);
			return;
		};


		// ==========================================
		socket.on('job_open_response', function(project_job)
		{
			$scope.notice = "Opened job [" + project_job.project_name + ":" + project_job.job_id + "].";
			$scope.project_name = project_job.project_name;
			$scope.project_job = project_job;

			project_job_project_script.setValue(project_job.project_script);
			project_job_project_script.clearSelection();

			$scope.$apply();
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Job Delete
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.job_delete_request = function job_delete_request(project_name, job_id)
		{
			$scope.notice = "Deleting job [" + project_name + ":" + job_id + "].";
			$scope.errors = [];
			$scope.project_job = null;
			socket.emit('job_delete_request', project_name, job_id);
			return;
		};


		// ==========================================
		socket.on('job_delete_response', function(project_name, job_id)
		{
			$scope.notice = "Deleted job [" + project_name + ":" + job_id + "].";
			$scope.project_name = project_name;
			$scope.project_job = null;
			$scope.$apply();
			location.href = "?project=" + project_name;
			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Job Artifact
		//
		//=====================================================================
		//=====================================================================


		// ==========================================
		$scope.job_artifact_request = function job_artifact_request(project_name, job_id, artifact_name)
		{
			$scope.notice = "Retrieving artifact [" + job_id + ":" + artifact_name + "].";
			$scope.errors = [];

			socket.emit('job_artifact_request', project_name, job_id, artifact_name);
			return;
		};


		// ==========================================
		socket.on('job_artifact_response', function(artifact)
		{
			$scope.notice = "Retrieved artifact [" + artifact.job_id + ":" + artifact.artifact_name + "].";
			$scope.artifact = artifact;
			$scope.$apply();

			// Replace the file viewer with the new file source
			$("#fileviewer_wrapper").find("#fileview").remove();
			if (artifact.artifact_name.endsWith('.html'))
			{
				$("#fileviewer_wrapper").append('<div id="file_view"></div>');
				// var file_view = $("#file_view")[0];
				// file_view.innerHTML = artifact.artifact_content;
				document.getElementById("file_view").innerHTML = artifact.artifact_content;
				var test = document.getElementById("file_view").innerHTML;
			}

			// $scope.$apply();

			$('#current_file_modal').modal('show');

			return;
		});


		//=====================================================================
		//=====================================================================
		//
		//		Help
		//
		//=====================================================================
		//=====================================================================

		$scope.show_help = function show_help()
		{
			$('#help_modal').modal('show');
			return;
		}


		//=====================================================================
		//=====================================================================
		//
		//		App Startup
		//
		//=====================================================================
		//=====================================================================

		$scope.notice = "";
		$scope.errors = [];
		$scope.page_mode = '';

		// Common to all modes.
		$scope.project_name = null;

		// Project List Mode
		$scope.project_list = null;

		// Project Edit Mode
		$scope.last_project_steps = null;
		$scope.job_list = null;
		$scope.current_job = null;

		// Project Job Mode
		$scope.project_job = null;

		// Parse the url to determine the page mode.
		var url_parameters = $(location).attr('search');
		var ich_project = url_parameters.indexOf('?project=');
		var ich_job = url_parameters.indexOf('&job=');

		if ((ich_project < 0) && (ich_job < 0))
		{
			// Project List mode.
			$scope.page_mode = 'project list';
			$scope.project_list_request();
		}
		else if ((ich_project >= 0) && (ich_job < 0))
		{
			// Project Edit mode.
			$scope.page_mode = 'project edit';
			var project_name = url_parameters.slice(ich_project + 9);
			$scope.project_open_request(project_name);
			$scope.job_list_request(project_name);
		}
		else if ((ich_project >= 0) && (ich_job >= 0) && (ich_job > ich_project))
		{
			// Project Job mode.
			$scope.page_mode = 'project job';
			var project_name = url_parameters.slice(ich_project + 9, ich_job);
			var job_id = url_parameters.slice(ich_job + 5);
			$scope.job_open_request(project_name, job_id);
		}



	});
