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

"""Sensor userdefined datapoint type, originally defined in resource file set
apollodev 90:00:01:06:00:00:00:00-4.  """


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined


class Sensor(izot.resources.base.Structure):
    """Sensor userdefined datapoint type.  Boolean."""

    class firstcalType(izot.resources.base.Structure):

        def __init__(self):
            super().__init__(
                key=-1,
                scope=-1
            )

            self.__day = izot.resources.base.Scaled(
                size=1,
                signed=False,
                minimum=0,
                maximum=255
            )
            self._register(('day', self.__day))

            self.__month = izot.resources.base.Scaled(
                size=1,
                signed=False,
                minimum=0,
                maximum=255
            )
            self._register(('month', self.__month))

            self.__year = izot.resources.base.Scaled(
                size=2,
                signed=False,
                minimum=0,
                maximum=65535
            )
            self._register(('year', self.__year))

        def __set_day(self, v):
            self.__day._value = v

        day = property(
            lambda self: self.__day._value,
            __set_day,
            None,
            """."""
        )

        def __set_month(self, v):
            self.__month._value = v

        month = property(
            lambda self: self.__month._value,
            __set_month,
            None,
            """."""
        )

        def __set_year(self, v):
            self.__year._value = v

        year = property(
            lambda self: self.__year._value,
            __set_year,
            None,
            """."""
        )

        def __len__(self):
            """Return the length of the type, in bytes."""
            return 4

    def __init__(self):
        super().__init__(
            key=3,
            scope=4
        )

        self.__gasname = izot.resources.base.Array(
            [
                izot.resources.base.Scaled(
                    size=1,
                    signed=False,
                    minimum=0,
                    maximum=255
                ) for i in range(8)
            ]
        )
        self._register(('gasname', self.__gasname))

        self.__unityp = izot.resources.base.Scaled(
            size=1,
            signed=False,
            minimum=0,
            maximum=255
        )
        self._register(('unityp', self.__unityp))

        self.__partnum = izot.resources.base.Array(
            [
                izot.resources.base.Scaled(
                    size=2,
                    signed=False,
                    minimum=0,
                    maximum=65535
                ) for i in range(2)
            ]
        )
        self._register(('partnum', self.__partnum))

        self.__mak_tlv = izot.resources.base.Scaled(
            size=2,
            signed=True,
            minimum=-32768,
            maximum=32767
        )
        self._register(('mak_tlv', self.__mak_tlv))

        self.__supress = izot.resources.base.Scaled(
            size=1,
            signed=False,
            minimum=0,
            maximum=255
        )
        self._register(('supress', self.__supress))

        self.__fraction = izot.resources.base.Scaled(
            size=1,
            signed=True,
            minimum=-128,
            maximum=127
        )
        self._register(('fraction', self.__fraction))

        self.__sernum = izot.resources.base.Scaled(
            size=2,
            signed=False,
            minimum=0,
            maximum=65535
        )
        self._register(('sernum', self.__sernum))

        self.__firstcal = Sensor.firstcalType(
        )
        self._register(('firstcal', self.__firstcal))

        self.__sensity = izot.resources.base.Scaled(
            size=2,
            signed=False,
            minimum=0,
            maximum=65535
        )
        self._register(('sensity', self.__sensity))

        self.__amplqual = izot.resources.base.Scaled(
            size=1,
            signed=False,
            minimum=0,
            maximum=255
        )
        self._register(('amplqual', self.__amplqual))

        self.__gradqual = izot.resources.base.Scaled(
            size=1,
            signed=False,
            minimum=0,
            maximum=255
        )
        self._register(('gradqual', self.__gradqual))
        self._original_name = 'UNVT_Sensor'
        self._definition = userdefined.add(self)


    def __set_gasname(self, v):
        self.__gasname._value = v

    gasname = property(
        lambda self: self.__gasname._value,
        __set_gasname,
        None,
        """."""
    )

    def __set_unityp(self, v):
        self.__unityp._value = v

    unityp = property(
        lambda self: self.__unityp._value,
        __set_unityp,
        None,
        """."""
    )

    def __set_partnum(self, v):
        self.__partnum._value = v

    partnum = property(
        lambda self: self.__partnum._value,
        __set_partnum,
        None,
        """."""
    )

    def __set_mak_tlv(self, v):
        self.__mak_tlv._value = v

    mak_tlv = property(
        lambda self: self.__mak_tlv._value,
        __set_mak_tlv,
        None,
        """."""
    )

    def __set_supress(self, v):
        self.__supress._value = v

    supress = property(
        lambda self: self.__supress._value,
        __set_supress,
        None,
        """."""
    )

    def __set_fraction(self, v):
        self.__fraction._value = v

    fraction = property(
        lambda self: self.__fraction._value,
        __set_fraction,
        None,
        """."""
    )

    def __set_sernum(self, v):
        self.__sernum._value = v

    sernum = property(
        lambda self: self.__sernum._value,
        __set_sernum,
        None,
        """."""
    )

    def __set_firstcal(self, v):
        self.__firstcal._value = v

    firstcal = property(
        lambda self: self.__firstcal._value,
        __set_firstcal,
        None,
        """."""
    )

    def __set_sensity(self, v):
        self.__sensity._value = v

    sensity = property(
        lambda self: self.__sensity._value,
        __set_sensity,
        None,
        """."""
    )

    def __set_amplqual(self, v):
        self.__amplqual._value = v

    amplqual = property(
        lambda self: self.__amplqual._value,
        __set_amplqual,
        None,
        """."""
    )

    def __set_gradqual(self, v):
        self.__gradqual._value = v

    gradqual = property(
        lambda self: self.__gradqual._value,
        __set_gradqual,
        None,
        """."""
    )

    def __len__(self):
        """Return the length of the type, in bytes."""
        return 27


if __name__ == '__main__':
    # unit test code.
    item = Sensor()
    pass