# Deprecated in favor of this project: https://github.com/jlpatter/oxidized_git

# OrangeGitFish

![There's supposed to be an image here...](./fish.png)

This is my electron Git GUI application, OrangeGitFish! I aim to provide the majority of features that git provides but within a GUI!

Features so far:

* Initialize an empty repository
* Open a repository
* Clone a repository
* Fetch
* Pull
* Push
* Stage files (individual or all)
* Unstage (i.e. reset) files
* Commit changes
* View the history in the graph
* Checkout branches
* Create new branches
* And more!

### Running on Linux

You will need to run the following commands in order to properly save credentials.

* Debian/Ubuntu: `sudo apt install libsecret-1-dev`
* Red Hat-based: `sudo yum install libsecret-devel`
* Arch-based: `sudo pacman -S libsecret`

### Development
Setup environment: run `npm install`, then run `npm run install-app-deps` (which takes a really long time as it's compiling nodegit). If those steps throw any errors,
be sure to install the missing dependencies or log an issue. You may want to install `nvm`
and run `nvm use` in the project directory in order to use the correct version of node.

#### Windows Development
Perform the following steps in order:

* Install Python2 and Python3
* Install the LTS version (<17) of Nodejs (DO NOT use nvm unless you know what you're doing)
* When installing Nodejs, be sure to select the option to install additional compilation tools and such (if the install fails/hangs halfway through, this is normal).
* Make sure that [Chocolatey](https://chocolatey.org/) is installed
* (Potentially optional) install visual studio community 2017
* Run the following: `choco install visualstudio2017buildtools` (yes, even if visual studio community 2017 is installed. Also, 2017 specifically is required as it is hardcoded in nodegit)
* Run the following: `choco install openssl` (yes, even though it gets built during `npm install`)
* Run the following: `choco install nasm` and add the directory containing the NASM executable to your PATH variable (yes, even though it's bundled with nodejs)
* Install [Strawberry Perl](https://strawberryperl.com/)
* Clone OrangeGitFish somewhere
* In the OrangeGitFish directory, Run `npm install`
* Run `npm run install-app-deps`
* Run `npm run start`
