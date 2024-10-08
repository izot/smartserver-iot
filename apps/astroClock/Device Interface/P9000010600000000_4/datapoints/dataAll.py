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

"""dataAll userdefined datapoint type, originally defined in resource file
set apollodev 90:00:01:06:00:00:00:00-4.  """


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined


class dataAll(izot.resources.base.Structure):
    """dataAll userdefined datapoint type.  ."""

    def __init__(self):
        super().__init__(
            key=1,
            scope=4
        )

        self.__counter = izot.resources.base.Array(
            [
                izot.resources.base.Scaled(
                    size=4,
                    signed=False,
                    minimum=0,
                    maximum=4294967295
                ) for i in range(4)
            ]
        )
        self._register(('counter', self.__counter))

        self.__faultCounter = izot.resources.base.Scaled(
            size=2,
            signed=False,
            minimum=0,
            maximum=65535
        )
        self._register(('faultCounter', self.__faultCounter))
        self._original_name = 'UNVTdataAll'
        self._definition = userdefined.add(self)


    def __set_counter(self, v):
        self.__counter._value = v

    counter = property(
        lambda self: self.__counter._value,
        __set_counter,
        None,
        """."""
    )

    def __set_faultCounter(self, v):
        self.__faultCounter._value = v

    faultCounter = property(
        lambda self: self.__faultCounter._value,
        __set_faultCounter,
        None,
        """."""
    )

    def __len__(self):
        """Return the length of the type, in bytes."""
        return 18


if __name__ == '__main__':
    # unit test code.
    item = dataAll()
    pass
