#include "libidl.h"
#include "example.h"
#include <unistd.h>

extern Idl *idl;
static IdiActiveCB activeCB;

// Dummy value and priority array for sake of this example
// Would be read/writing to designated datapoint instead

double dpValue = 0;
char *prio_array = NULL;

/* IdiStart: Custom driver startup function called from main.cpp  */

int IdiStart() 
{
	/* Your custom IDL driver can start up any other driver-specific  */
	/* actions here.  For example, you could open a connection to a   */
	/* serial port or a USB interface.  You should return a 0 here    */
	/* if your code started up your driver properly or else return 1. */

	printf("The Example IDL Driver is connected and ready...\n");

    return 0;
}

/* *ExampleRxFunction: Example thread called from main.cpp to allow  */
/* this custom driver to receive and process async incoming packets. */

void *ExampleRxFunction(void* argA)
{
    printf("The Example IDL Driver thread started...\r\n");
    while(1)
    {
		/* Custom code to receive & process incoming packets */

		usleep(50000); 			// 50 ms
    }

    return NULL;
}

static int IdiGenericResultFsm(void)
{
    int iRet = 0;
    switch(activeCB.action) {
        case IdiaNone:
            break;
        case IdiaDpwrite:
            /*
             *  Do our write
             */
            dpValue = activeCB.value;
            printf(" Value written: %lf\n", dpValue);
            IdlDpWriteResult(activeCB.ReqIndex, activeCB.dev, activeCB.dp, IErr_Success);
            activeCB.action = IdiaNone;
            break;
        case IdiaDpread:
                /*
                 *  Do our read
                 */
                activeCB.action = IdiaNone;
                printf(" Value read: %lf\n", dpValue);
                IdlDpReadResult(activeCB.ReqIndex, activeCB.dev, 
                    activeCB.dp, activeCB.context, IErr_Success, prio_array, dpValue);
            break;
        case IdiaProvision:
            /*
             *  Provision our device
             */
            activeCB.action = IdiaNone;
            IdlDevProvisionResult(activeCB.ReqIndex, activeCB.dev, IErr_Success);
            break;
        default:
            activeCB.action = IdiaNone;     // unknown, clear it.
            break;
    }
    return iRet;
}

static int IdiBlockWhileBusy(uint tmos) {
    int iRet = 0;
    if (activeCB.action != IdiaNone) {
        time_t timeStart = time(NULL);
        while (activeCB.action != IdiaNone) {
            IdiGenericResultFsm();
            // check again -
            if (activeCB.action == IdiaNone) {
                break;
            }
            if ((uint) (time(NULL) - timeStart) >= tmos) {
                printf("%s: Timed out - UNID: %s, action: %d", __FUNCTION__, 
                    (activeCB.dev->unid) ? activeCB.dev->unid : "NULL", activeCB.action);
                if (activeCB.action != IdiaProvision) {     // IdiaProvision has its own timeouts.
                    activeCB.action = IdiaNone;
                }
                iRet = -1;
                break;
            }
            usleep(30000); // 30 ms
        }
    }
    return iRet;
}

/* dp_read_cb: Callback function registered with the IDL Library  */
/* which triggers when a data point read occurs.  This checks if  */
/* the custom driver (idi) is busy and if not simulates a dp read.*/

int dp_read_cb(int request_index, IdlDev *dev, IdlDatapoint *dp, void *context)
{
    printf("\n%s:\n", __FUNCTION__);			// Print out the called function to the console
	
    printf(" dev.info.product: %s\n"				// Print out selected fields to the console
        " dev.unid: %s\n"
        " dp.name: %s\n"
        ,dev->info.product,
        dev->unid,
        dp->name
    );

    if (IdiBlockWhileBusy(IDI_ACTION_DP_TIMEOUT)) {
        return IErr_IdiBusy;
    }
    // Setup read
    activeCB.action = IdiaDpread;
    activeCB.ReqIndex = request_index;
    activeCB.dev = dev;
    activeCB.dp = dp;
    activeCB.context = context;
    if (IdiBlockWhileBusy(IDI_ACTION_DP_TIMEOUT)) {
        return IErr_IdiBusy;
    }
    return IErr_Success;

}

/* dp_write_cb: Callback function registered with the IDL Library */
/* which triggers when a data point write occurs.  This checks if */
/* the custom driver (idi) is busy and if not simulates a dp write.*/

int dp_write_cb(int request_index, IdlDev *dev, IdlDatapoint *dp, int prio, int relinquish, double value)
{
    int idlError = IErr_Success;

    printf("\n%s:\n", __FUNCTION__);			// Print out the called function to the console
	
    printf(" dev.info.product: %s\n"				// Print out selected fields to the console
        " dev.unid: %s\n"
        " dp.name: %s\n"
        ,dev->info.product,
        dev->unid,
        dp->name
    );

    if (IdiBlockWhileBusy(IDI_ACTION_DP_TIMEOUT)) {
        return IErr_IdiBusy;
    }
    // Setup write
    activeCB.action = IdiaDpwrite;
    activeCB.ReqIndex = request_index;
    activeCB.dev = dev;
    activeCB.dp = dp;
    activeCB.prio = prio;
    activeCB.relinquish = relinquish;
    activeCB.value = value;
    if (IdiBlockWhileBusy(IDI_ACTION_DP_TIMEOUT)) {
        return IErr_IdiBusy;
    }
    return idlError;
}

/* dev_create_cb: Callback function registered with the IDL Library  */
/* which triggers when a device of this protocol type is created.    */

int dev_create_cb(int request_index, IdlDev *dev, char *args, char *xif_dp_array)
{
    int idlError = IErr_Success;

    printf("\n%s:\n", __FUNCTION__);			// Print out the called function to the console
	
    printf(" dev.state: %d\n"				// Print out selected fields to the console
        " dev.info.name: %s\n"
		" dev.info.manufacturer: %s\n"	
        " dev.info.product: %s\n"
        " dev.unid: %s\n"
        " dev.handle: %s\n"
        " dev.type: %s\n"
		" args: %s\n"
        ,dev->state,
        dev->info.name,
        dev->info.manufacturer,
        dev->info.product,
        dev->unid,
        dev->handle,
        dev->type,
		(args) ? args : "NULL"
    );
	  
    if (dev && dev->handle) {
        /*
         *  Create a device
         */
    } else {
        printf("%s: Malformed IdlDev", __FUNCTION__);
        idlError = IErr_Failure;
    }
    IdiFree(args);      // required
    IdlDevCreateResult(request_index, dev, idlError);
    return idlError;
}

/* dev_provision_cb: Callback function registered with the IDL Library  */
/* which triggers when a request occurs to provision a device that uses */
/* this protocol / driver. 												*/

int dev_provision_cb(int request_index, IdlDev *dev, char *args)
{
    int idlError = IErr_Success;

    printf("\n%s:\n", __FUNCTION__);			// Print out the called function to the console
	
    printf(" dev.state: %d\n"				// Print out selected fields to the console
        " dev.info.name: %s\n"
		" dev.info.manufacturer: %s\n"	
        " dev.info.product: %s\n"
        " dev.unid: %s\n"
        " dev.handle: %s\n"
        " dev.type: %s\n"
		" args: %s\n"
        ,dev->state,
        dev->info.name,
        dev->info.manufacturer,
        dev->info.product,
        dev->unid,
        dev->handle,
        dev->type,
		(args) ? args : "NULL"
    );

    if (IdiBlockWhileBusy(IDI_ACTION_DP_TIMEOUT)) {
        return IErr_IdiBusy;
    }
    activeCB.action = IdiaProvision;
    activeCB.ReqIndex = request_index;
    activeCB.dev = dev;
    activeCB.args = args;
    if (IdiBlockWhileBusy(IDI_ACTION_DP_TIMEOUT)) {
        return IErr_IdiBusy;
    }
    return idlError;
}

/* dev_deprovision_cb: Callback function registered with the IDL */
/* Library which triggers when a request occurs to deprovision a */
/* device that uses this protocol / driver. 					 */

int dev_deprovision_cb(int request_index, IdlDev *dev)
{
    int idlError = IErr_Success;
//    printf("%s: UNID: %s\n", __FUNCTION__, (dev && dev->unid) ? dev->unid : "NULL");

    printf("\n%s:\n", __FUNCTION__);			// Print out the called function to the console
	
    printf(" dev.state: %d\n"				// Print out selected fields to the console
        " dev.info.name: %s\n"
		" dev.info.manufacturer: %s\n"	
        " dev.info.product: %s\n"
        " dev.unid: %s\n"
        " dev.handle: %s\n"
        " dev.type: %s\n"
        ,dev->state,
        dev->info.name,
        dev->info.manufacturer,
        dev->info.product,
        dev->unid,
        dev->handle,
        dev->type
    );

    /*
     *  Deprovision this device
     */
	 
    IdlDevDeprovisionResult(request_index, dev, idlError);
    return idlError;
}

/* dev_replace_cb: Callback function registered with the IDL Library */
/* which triggers when a request occurs to replace a device that	 */
/* uses this protocol / driver. 					 				 */

int dev_replace_cb(int request_index, IdlDev *dev, char *args)
{
    int idlError = IErr_Success;
//    printf("%s: UNID: %s, ARGS: %s\n", __FUNCTION__,
//        (dev && dev->unid) ? dev->unid : "NULL", (args) ? args : "NULL");
		
    printf("\n%s:\n", __FUNCTION__);			// Print out the called function to the console
	
    printf(" dev.state: %d\n"				// Print out selected fields to the console
        " dev.info.name: %s\n"
		" dev.info.manufacturer: %s\n"	
        " dev.info.product: %s\n"
        " dev.unid: %s\n"
        " dev.handle: %s\n"
        " dev.type: %s\n"
		" args: %s\n"
        ,dev->state,
        dev->info.name,
        dev->info.manufacturer,
        dev->info.product,
        dev->unid,
        dev->handle,
        dev->type,
		(args) ? args : "NULL"
    );
				
    /*
     *  Slot in the new device and deprovision the old device
     */
	 
    IdiFree(args);
    IdlDevReplaceResult(request_index, dev, idlError);
    return idlError;
}

/* dev_delete_cb: Callback function registered with the IDL Library  */
/* which triggers when a device of this protocol type is deleted.    */

int dev_delete_cb(int request_index, IdlDev *dev)
{
    int idlError = IErr_Success;
	
    printf("\n%s:\n", __FUNCTION__);			// Print out the called function to the console
	
    printf(" dev.state: %d\n"				// Print out selected fields to the console
        " dev.info.name: %s\n"
		" dev.info.manufacturer: %s\n"	
        " dev.info.product: %s\n"
        " dev.unid: %s\n"
        " dev.handle: %s\n"
        " dev.type: %s\n"
        ,dev->state,
        dev->info.name,
        dev->info.manufacturer,
        dev->info.product,
        dev->unid,
        dev->handle,
        dev->type
    );

    /*
     *  Delete this device
     */

    IdlDevDeleteResult(request_index, dev, idlError);
    return idlError;
}
