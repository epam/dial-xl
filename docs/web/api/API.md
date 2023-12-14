## Quant Grid API description

Web server exposes WebSocket API for communication.  
API description can be found [here](./../../../backend/proto/src/main/proto/api.proto)

We support 2 types of messages:
1. Request-Response pairs
2. Events

All requests must have a correlation id and a request content.  
All responses must include provided correlation id and response content.

Response must be sent directly to the client who sent a request.  
If data needs to be distributed to all client sessions - server can send an event messages.  
Event message uses response content (without correlation id and status).

Simple workflow example:  
![image](./diagram/simple-flow.png)

Concurrent workflow example:  
![image](./diagram/concurrent-flow.png)

Dynamic fields workflow example:  
![image](./diagram/dynamic-fields-flow.png)