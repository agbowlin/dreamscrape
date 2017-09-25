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
ProjectLib.GetJobArtifact =
	function GetJobArtifact(ProjectName, JobID, ArtifactName)
	{
		var job_folder = ProjectLib.GetJobFolder(ProjectLib.ProjectsFolder, ProjectName, JobID);
		var filename = npm_path.join(job_folder, ArtifactName);
		var file_contents = npm_fs.readFileSync(filename);
		file_contents = npm_string(file_contents);
		return file_contents.toString();
	}

