# Algonia

Seamlessly combine different programming languages and libs visually.
 
# Table of contents

- [Intruduction](#introduction)
  - [What is Algonia](what-is-algonia)
  - [HelloWorld](helloworld)
- [Architecture](#architecture)  

# Introduction
## What is Algonia
Algonia is Visual Microservices platform to simplify programming languages interoperability
## Hello World
You can read more about it and check Hello World example [here](https://dev.to/tvinko/languages-interoperability-406f).


# Architecture
Algonia platform contains three main parts:

***Algonia Engine***<br/>
Independent executing engine capable of hosting different environments and executing code written in different programming languages.<br/>
It's a gluing mechanism between your and 3rd party libraries.<br/><br/>
Check it out [here](https://github.com/tvinko/AlgoniaEngine).<br/><br/>

***Algonia VS***<br/>
Development tool for combining code visually.<br/>
You are currently here.<br/><br/>

***Algonia Engine Bindings***<br/>
Algonia Engine is capable to interact and host environments for different programming languages.<br/>
However, some languages are required to implement standard interface so that communication with Algonia Engine performs flawlessly.
This is one time task per language.<br/><br/>

Example of language that didn't need any additional bindings is Python. 
<br/>Both, Python interpreter environment hosting and system calls are performed inside Algonia Engine.<br/><br/>
Example of language that needed additional bindings is .NET Core.<br/>
Algonia Engine hosts .NET Core runtime, but tiny wrapper is needed on .NET Core side that offers practically unlimited integration possibilities.<br/><br/>
You can see .NET Core bindings [here](https://github.com/tvinko/AlgoniaCsNodes)



