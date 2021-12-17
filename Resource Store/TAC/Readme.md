TAC_IO.dtp
===

The X400 series TAC IO modules are used systems with open and proprietary interfaces.  This device type package defines XIF and XML resources to support devices using these XIF files: `X410w02.xif`, `X410W03.xif`, `X420Aw01.xif`, `X420w02.xif`, `X420w03.xif`, `X450wAw01.xif`, `X450w02.xif`, `X450w03.xif`, `X470w01.xif`, and `X490w01.xif`.  

When engineering a project that includes these devices, consider including only devices using these XIF files `X450Aw01`, `X420Aw01` in your targeted export subsystem.  Only these devices include an LonMark style functional block interface with standard and TAC provided UNVT/UCPT resource file.   

If your export includes the proprietary message tag based IO modules, this package will provide the necessary interface files to allow `inex.exe` to complete, but the lack of network variables makes monitor and control of the IO impossible.




