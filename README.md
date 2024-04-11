# FiveM-GTA5Mods-Converter
The GTA5-Mods to FiveM converter is now available as a beta tool. This tool will allow you to enter a link to a vehicle from GTA5-Mods alongside a spawncode and it will output a FiveM ready resource, able to be extracted directly into your server.

This tool is fully open source, a compiled version is also available to simplify use for those who may not have all the necessary prerequisites installed. It is currently in a beta release, as not all functionality is working properly and you may experience bugs, if you have any issues please raise them on GitHub so that they can be resolved.

## Running the source code
If you do not wish to run the compiled version, you can also run the source code directly using Node.JS

### Prerequisites:
- Node.JS (Tested on v16.15.0)
- Some of the packages used may have their own requirements, if there are any errors running `npm install` read them carefully to check for missing dependencies

### Instructions
- Download the source code and extract it into a folder
- Create a "cache" and an "output" folder in the directory with your installation, it will be on the same level as the folder called "Utils" as well as all the files
- Open a terminal session in your installation directory
- Run `npm install` to install the required packages, if you have an error message read it carefully to check for any missing dependencies
- In the config.js you can set your operating system, the script has currently only been tested on Windows but may also work on Linux, to change to linux set the OS to `Linux`
- Run `node index.js` to start the script

## Known Issues
- If a vehicles texture file is over 16mb, it will split the texture file but will not change the vehicles.meta file to account for this, you will need to do this manually
- May not work properly on linux
