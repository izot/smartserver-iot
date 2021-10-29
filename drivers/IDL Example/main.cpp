#include "libidl.h"
#include "example.h"
#include <pthread.h>

int main(void)
{
    char conf_path[256] ="/var/apollo/data/example/example-idl.conf";
    pthread_t ExampleRxThread;

    Idl *idl = IdlNew();		// Create a new driver instance

    /* Register the Example Driver Callback Routines with the IAP Driver Library (IDL) */
	
    IdlDevCreateCallbackSet(idl, dev_create_cb);
    IdlDevProvisionCallbackSet(idl, dev_provision_cb);
    IdlDevDeprovisionCallbackSet(idl, dev_deprovision_cb);
    IdlDevReplaceCallbackSet(idl, dev_replace_cb);
    IdlDevDeleteCallbackSet(idl, dev_delete_cb);
    IdlDpReadCallbackSet(idl, dp_read_cb);
    IdlDpWriteCallbackSet(idl, dp_write_cb);

    if (IdiStart() == 0) {
        printf("The Example IDL Driver started up...\r\n");
		
		/* Create any POSIX threads your driver might need before calling  */
		/* IdlInit() as IdlInit() never returns.  For example, this driver */
		/* creates a thread that could be used to process asynchronous     */
		/* communications packets the driver needs to capture and process. */

        pthread_create( &ExampleRxThread, NULL, ExampleRxFunction, NULL);

		/* Initialize the IDL Example Driver using the parameters defined */
		/* in example-idl.conf configuration file. IdlInit() never exits. */

        IdlInit(conf_path, idl);
    }
    return 0;
}

