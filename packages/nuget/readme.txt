===== Nuget package build instructions ======

In order to build the nuget package you will need to run
the nuget.exe command line tool. 

  ~ nuget pack

This will use the package.nuspec manifest along with the files and folders
in the contents folder and will generate a .nupkg file.

More info can be found at nuget.org