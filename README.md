## Predix Security Starter Kit

### Prerequisites

- Node.js, used to run JavaScript tools from the command line.
- npm, the node package manager, installed with Node.js and used to install Node.js packages.
- gulp, a Node.js-based build tool.
- bower, a Node.js-based package manager used to install front-end packages

**To install dependencies:**

1)  Check your Node.js version.

```sh
node --version
```

The version should be at or above 0.12.x.

2)  If you don't have Node.js installed, or you have a lower version, go to [nodejs.org](https://nodejs.org) and click on the big green Install button.

3)  Install `gulp` and `bower` globally.

```sh
npm install -g gulp bower
```

This lets you run `gulp` and `bower` from the command line.

4) In addition, you will need the Cloud Foundry CLI tool:
<https://github.com/cloudfoundry/cli/releases/tag/v6.12.2>
Then you'll need to login with your Predix credentials.

### Getting Started
First you need to run a few commands to create your instance of Predix UAA and find its URL.  Don't forget your new admin secret!
```
cf create-service predix-uaa beta <<new-uaa-instance-name>> -c '{"adminClientSecret": "<<new-admin-secret>>"}'
git clone https://github.com/PredixDev/security-starter-node-service.git
cd security-starter-node-service
cf push <<new-sample-service-name>>
cf bind-service <<new-sample-service-name>> <<new-uaa-instance-name>>
cf env <<new-sample-service-name>>
```
Check the output of that last command, for the "predix-uaa" service, and copy the "uri" for that service, from the "credentials" object.
Open up app/uaaConfig.json and enter the URL of the new UAA service instance.

Now you're ready to start running this application locally with these commands:
```
npm install
bower install
gulp serve
```
