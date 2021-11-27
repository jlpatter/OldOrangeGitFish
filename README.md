# eGitGUI

![There's supposed to be an image here...](./fish.png)

This is my electron Git GUI application! I aim to provide the majority of features that git provides but within a GUI!

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

### Development
Setup environment: run `npm install`, then run `npm rebuild` (which takes a really long time as it's compiling nodegit). If either step throws errors,
be sure to install the missing dependencies or log an issue. You may want to install `nvm`
and run `nvm use` in the project directory in order to use the correct version of node.

#### Windows Development
(I'm so sorry, prepare for pain)

Perform the following steps in order:

* Install Python2 and Python3
* Install the LTS version (<17) of Nodejs (DO NOT use nvm unless you want more pain)
* When installing Nodejs, be sure to select the option to install additional compilation tools and such (if the install fails/hangs halfway through, this is normal).
* Make sure that [Chocolatey](https://chocolatey.org/) is installed
* (Potentially optional) install visual studio community 2017
* Run the following: `choco install visualstudio2017buildtools` (yes, even if visual studio community 2017 is installed. Also, 2017 specifically is required as it is hardcoded in nodegit)
* Run the following: `choco install openssl` (yes, even though it gets built during `npm install`)
* Run the following: `choco install nasm` and add the directory containing the NASM executable to your PATH variable (yes, even though it's bundled with nodejs)
* Install [Strawberry Perl](https://strawberryperl.com/)
* Clone egitgui somewhere
* In the egitgui directory, Run `npm install`
* Run `npm run start`
