# klaviyo-in-app-bridge
This repository hosts basic HTML and JS files required to support In App Forms functionality for our mobile SDKs.
It should also function as a standalone repo for manual testing (with a regular web browser) and simple unit tests and CI. 

## Why
Since these files are shared requirements for both repos, extracting them into a single repo allows us to develop 
and test in one place to avoid duplicative code and the easy mistakes that arise from that maintenance overhead. 
We can also include some simple testing tools in this repo so that it can be developed independently from either 
SDK platform by just using a web browser.

## Requirements
As of writing, javascript code should be written with **iOS 13** and **Android API level 23** in mind. 
Please search MDN for any JS functionality you're using to verify webview support. When in doubt,
opt for the simplest, most backward compatible code, think ECMA 5. For example, optional chaining support 
was added in ECMAScript2020, Android's API level 23 is from 2015 and iOS 13 was released in 2019,
therefore avoid optional chaining.

## Local Development
Any IDE that supports web dev will do, since you just need HTML/JS support.

## How
We'll add this repo as a [git submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules) to each SDK repository.
When this repo is updated, each SDK will need to pull the latest changes. We can add automatations to ease the process. 
