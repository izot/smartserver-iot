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

"""capState userdefined enumeration type, originally defined in resource file
set apollodev 90:00:01:06:00:00:00:00-4."""


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined


class capState(izot.resources.base.Enumeration):
    """capState userdefined enumeration."""

    MEM_NUL = -1

    # NOTE member DISABLED was renamed to MEM_ to obtain a common prefix
    # throughout this enumeration.
    MEM_ = 0

    # NOTE member ENABLED_LOCKOUT was renamed to MEM_LOCKOUT to obtain a
    # common prefix throughout this enumeration.
    MEM_LOCKOUT = 1

    # NOTE member ENABLED was renamed to MEM_ to obtain a common prefix
    # throughout this enumeration.
    MEM_ = 2

    # NOTE member PRE_ALARM was renamed to MEM_ALARM to obtain a common
    # prefix throughout this enumeration.
    MEM_ALARM = 3

    # NOTE member ALARM_ACTIVE was renamed to MEM_ACTIVE to obtain a common
    # prefix throughout this enumeration.
    MEM_ACTIVE = 4

    # NOTE member INPUTS_INVALID was renamed to MEM_INVALID to obtain a
    # common prefix throughout this enumeration.
    MEM_INVALID = 5

    def __init__(self):
        super().__init__(
            key=9,
            scope=4,
            prefix='MEM_'
        )
        self._original_name = 'capState'
        self._definition = userdefined.add(self)


if __name__ == '__main__':
    # unit test code.
    item = capState()
    pass