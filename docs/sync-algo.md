## Requirements
1. Single user working in a single tab cannot conflict with himself.
2. Optimism: User should never blocked be and can apply changes at his own rapid phase, local system will always act as if changes were accepted by remote system
3. Basic correctness: avoid override remote changes (made by different user) unless explicitly asked by a user.
4. Basic safety: avoid losing user local changes unless explicitly asked by a user.
5. Extensibility: compatibility with more sofisticated resolution algorithm like git-like text merge.

## Pseudo code

```
String latestDsl;

String localEtag;
String localDsl;

String remoteEtag;

Request inflightRequest;
String inflightDSL;


void init() {
    await subscribe(::onEvent);
    localDSL = null;
    localEtag = null; 
    latestDSL = null;
    inflightRequest = get(this::onSyncGet);     
}


void sync() {
  if (inflightRequest == null) {
    if (remoteEtag != null) {
       boolean isRemoteMightBeChanged = (remoteEtag != localEtag);
       remoteEtag = null;
       
       if (isRemoteMightBeChanged) {
         inflightRequest = get(this::onSyncGet);
         return;
       }       
    } 
    
    if (localDsl != latestDsl) {
       inflightDSL = latestDSL;
       inflightRequest = put(latestDsl, {"IfMatch": localEtag}, this::onSyncPut)       
    }
  }
}

void onSyncGet(int status, String etag, String dsl) {
    assert status == 200
    inflightRequest = null;

    boolean hasPendingChanges = (localDsl != latestDsl);
    boolean takeRemoteChanges = !hasPendingChanges 
      || (remoteEtag == null // our state is not latest, too early to resolve
      && !resolveConflict(latestDsl, dsl));

    localEtag = etag;
    localDsl = dsl;

    if (takeRemoteChanges) {
        latestDsl = dsl;
    }

    sync();
}

void onSyncPut(int status, String etag) {
    assert status == OK || status == PRECONDITION_FAILED;
   
    if (status == 200) {
        localEtag = etag;
        localDsl = inflightDSL;
    } else {
        remoteEtag = etag;
    }
    inflightDSL = null;
    inflightRequest = null;
   
    sync();
}

void onUserDSLChange(String dsl) {
    latestDSL = dsl;
    sync();
}

void onEvent(String etag) {
    remoteEtag = etag;
    sync();
} 

boolean resolveConflict(String localDsl, String remoteDsl) {
    return true/false; // true - means take my changes, false - means take remote changes
}
```

## State transition diagram

![diagram](./img/sync-algo.svg)