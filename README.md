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
Setup environment: run `npm install`, then run `./node_modules/.bin/electron-rebuild`. If either step throws errors,
be sure to install the missing dependencies or log an issue. You may want to install `nvm`
and run `nvm use` in the project directory in order to use the correct version of node.
