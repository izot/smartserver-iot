# Copyright (C) 2013-2023 Echelon Corporation.  All Rights Reserved.
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
# Generated at 11-May-2023 17:11.

"""ifcTraffic userdefined datapoint type, originally defined in resource file
set apollodev 90:00:01:06:00:00:00:00-4.  """


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined


class ifcTraffic(izot.resources.base.Structure):
    """ifcTraffic userdefined datapoint type.  ."""

    def __init__(self):
        super().__init__(
            key=14,
            scope=4
        )

        self.__rxPps = izot.resources.base.Scaled(
            size=2,
            signed=False,
            scaling=(0.1, 0),
            minimum=0,
            maximum=6553.5
        )
        self._register(('rxPps', self.__rxPps))

        self.__txPps = izot.resources.base.Scaled(
            size=2,
            signed=False,
            scaling=(0.1, 0),
            minimum=0,
            maximum=6553.5
        )
        self._register(('txPps', self.__txPps))
        self._original_name = 'UNVTifcTraffic'
        self._definition = userdefined.add(self)


    def __set_rxPps(self, v):
        self.__rxPps._value = v

    rxPps = property(
        lambda self: self.__rxPps._value,
        __set_rxPps,
        None,
        """(packets/second)."""
    )

    def __set_txPps(self, v):
        self.__txPps._value = v

    txPps = property(
        lambda self: self.__txPps._value,
        __set_txPps,
        None,
        """(packets/second)."""
    )

    def __len__(self):
        """Return the length of the type, in bytes."""
        return 4


if __name__ == '__main__':
    # unit test code.
    item = ifcTraffic()
    pass