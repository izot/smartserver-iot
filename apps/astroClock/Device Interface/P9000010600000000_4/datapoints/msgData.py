# Copyright (C) 2013-2021 Echelon Corporation.  All Rights Reserved.
# Use of this code is subject to your compliance with the terms of the
# Echelon IzoT(tm) Software Developer's Kit License Agreement which is
# available at www.echelon.com/license/izot_sdk/.

# IzoT resources contained in this file are generated by an automated
# database to source code conversion process.  Grammar and punctuation within
# the embedded documentation may not be correct, as this data is gathered and
# combined from several sources.
# Names of resources and fields or members defined within a resource are
# derived from the same sources.  Names, capitalization and aspects of source
# code formatting may fail to comply with PEP-8 and PEP-257 recommendations
# due to the automated generation of these IzoT definitions.
# Generated at 24-Aug-2021 09:17.

"""msgData userdefined datapoint type, originally defined in resource file
set apollodev 90:00:01:06:00:00:00:00-4.  """


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined


class msgData(izot.resources.base.Structure):
    """msgData userdefined datapoint type.  ."""

    def __init__(self):
        super().__init__(
            key=6,
            scope=4
        )

        self.__rawMsg = izot.resources.base.Array(
            [
                izot.resources.base.Scaled(
                    size=1,
                    signed=False,
                    minimum=0,
                    maximum=255
                ) for i in range(42)
            ]
        )
        self._register(('rawMsg', self.__rawMsg))
        self._original_name = 'UNVTmsgData'
        self._definition = userdefined.add(self)


    def __set_rawMsg(self, v):
        self.__rawMsg._value = v

    rawMsg = property(
        lambda self: self.__rawMsg._value,
        __set_rawMsg,
        None,
        """."""
    )

    def __len__(self):
        """Return the length of the type, in bytes."""
        return 42


if __name__ == '__main__':
    # unit test code.
    item = msgData()
    pass