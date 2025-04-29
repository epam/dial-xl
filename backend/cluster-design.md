# Cluster Proposal

## Requirements
* Limit cpu and memory per project.

## Design
There are two types of nodes:
* Control - handles request from clients and selects which Compute node to use.
* Compute - performs calculations.

Algorithm:
1. Check if a project can use the previous node it used before. True: go to #5.
2. Check if there is a new node. True: go to #5.
3. Check if there are free nodes without pending calculations. True: select the least recently used node, go to #5.
4. Repeat #1-3 within some interval, e.g. 10 sec or so. False: go to #6.
5. Success
6. Failure

Pros:
* When projects < nodes. Each project is never evicted and is calculated on the same node.
* When projects > nodes and moderate calculations. Each project is given a solid chance to be calculated.

Cons:
* When projects > nodes and heavy calculations. Potentially can produce more cache misses cause projects will be evicted and moved on different nodes more likely.