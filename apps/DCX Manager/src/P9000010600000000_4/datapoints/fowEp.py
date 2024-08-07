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

"""fowEp userdefined datapoint type, originally defined in resource file set
apollodev 90:00:01:06:00:00:00:00-4.  """


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined


class fowEp(izot.resources.base.Structure):
    """fowEp userdefined datapoint type.  ."""

    def __init__(self):
        super().__init__(
            key=24,
            scope=4
        )

        self.__s0 = izot.resources.base.Scaled(
            size=1,
            signed=True,
            minimum=-128,
            maximum=127
        )
        self._register(('s0', self.__s0))

        self.__s1 = izot.resources.base.Scaled(
            size=1,
            signed=True,
            minimum=-128,
            maximum=127
        )
        self._register(('s1', self.__s1))

        self.__s2 = izot.resources.base.Scaled(
            size=1,
            signed=True,
            minimum=-128,
            maximum=127
        )
        self._register(('s2', self.__s2))

        self.__s3 = izot.resources.base.Scaled(
            size=1,
            signed=True,
            minimum=-128,
            maximum=127
        )
        self._register(('s3', self.__s3))

        self.__s4 = izot.resources.base.Scaled(
            size=1,
            signed=True,
            minimum=-128,
            maximum=127
        )
        self._register(('s4', self.__s4))

        self.__s5 = izot.resources.base.Scaled(
            size=1,
            signed=True,
            minimum=-128,
            maximum=127
        )
        self._register(('s5', self.__s5))

        self.__s6 = izot.resources.base.Scaled(
            size=1,
            signed=True,
            minimum=-128,
            maximum=127
        )
        self._register(('s6', self.__s6))
        self._original_name = 'UNVTfowEp'
        self._definition = userdefined.add(self)


    def __set_s0(self, v):
        self.__s0._value = v

    s0 = property(
        lambda self: self.__s0._value,
        __set_s0,
        None,
        """."""
    )

    def __set_s1(self, v):
        self.__s1._value = v

    s1 = property(
        lambda self: self.__s1._value,
        __set_s1,
        None,
        """."""
    )

    def __set_s2(self, v):
        self.__s2._value = v

    s2 = property(
        lambda self: self.__s2._value,
        __set_s2,
        None,
        """."""
    )

    def __set_s3(self, v):
        self.__s3._value = v

    s3 = property(
        lambda self: self.__s3._value,
        __set_s3,
        None,
        """."""
    )

    def __set_s4(self, v):
        self.__s4._value = v

    s4 = property(
        lambda self: self.__s4._value,
        __set_s4,
        None,
        """."""
    )

    def __set_s5(self, v):
        self.__s5._value = v

    s5 = property(
        lambda self: self.__s5._value,
        __set_s5,
        None,
        """."""
    )

    def __set_s6(self, v):
        self.__s6._value = v

    s6 = property(
        lambda self: self.__s6._value,
        __set_s6,
        None,
        """."""
    )

    def __len__(self):
        """Return the length of the type, in bytes."""
        return 7


if __name__ == '__main__':
    # unit test code.
    item = fowEp()
    pass
