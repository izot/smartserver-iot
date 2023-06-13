#ifndef EXAMPLE_H
#define EXAMPLE_H

#include <stdlib.h>

#define IdiFree(x) {if (x) { free(x); x = NULL;}}
#define IDI_ACTION_DP_TIMEOUT 30

typedef enum {
    IdiaNone = 0,
    IdiaProvision,
    IdiaDpread,
    IdiaDpwrite,
    Ida_last
} IdiAction;

// Various IDL 'result' bits
typedef struct _IdiActiveCB {
    double value;
    char *args;
    int prio;
    int relinquish;
    IdiAction action;
    int ReqIndex;
    IdlDev* dev;
    IdlDatapoint* dp;
    void* context;
} IdiActiveCB;

int IdiStart();
extern void *ExampleRxFunction(void* argA);

/* CALLBACKS */
int dp_read_cb(int request_index, IdlDev *dev, IdlDatapoint *dp, void *context);
int dp_write_cb(int request_index, IdlDev *dev, IdlDatapoint *dp, int prio, int relinquish, double value);
int dev_create_cb(int request_index, IdlDev *dev, char *args, char *xif_dp_array);
int dev_provision_cb(int request_index, IdlDev *dev, char *args);
int dev_deprovision_cb(int request_index, IdlDev *dev);
int dev_replace_cb(int request_index, IdlDev *dev, char *args);
int dev_delete_cb(int request_index, IdlDev *dev);

#endif
