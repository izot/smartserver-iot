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

"""MathOp userdefined enumeration type, originally defined in resource file
set apollodev 90:00:01:06:00:00:00:00-4."""


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined


class MathOp(izot.resources.base.Enumeration):
    """MathOp userdefined enumeration."""

    MEM_NUL = -1

    # NOTE member OP_ADD was renamed to MEM_ADD to obtain a common prefix
    # throughout this enumeration.
    # Add.
    MEM_ADD = 0

    # NOTE member OP_SUB was renamed to MEM_SUB to obtain a common prefix
    # throughout this enumeration.
    # Subtract.
    MEM_SUB = 1

    # NOTE member OP_MULT was renamed to MEM_MULT to obtain a common prefix
    # throughout this enumeration.
    # Multiply.
    MEM_MULT = 2

    # NOTE member OP_DIV was renamed to MEM_DIV to obtain a common prefix
    # throughout this enumeration.
    # Divide.
    MEM_DIV = 3

    # NOTE member OP_AND was renamed to MEM_AND to obtain a common prefix
    # throughout this enumeration.
    # Logical AND.
    MEM_AND = 4

    # NOTE member OP_OR was renamed to MEM_OR to obtain a common prefix
    # throughout this enumeration.
    # Logical OR.
    MEM_OR = 5

    def __init__(self):
        super().__init__(
            key=1,
            scope=4,
            prefix='MEM_'
        )
        self._original_name = 'MathOp'
        self._definition = userdefined.add(self)


if __name__ == '__main__':
    # unit test code.
    item = MathOp()
    pass
