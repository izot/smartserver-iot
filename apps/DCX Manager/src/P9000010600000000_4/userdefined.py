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

"""userdefined - a re-usable DRF definition object.  DRF definition objects
are used to document the source of a IzoTresource derived from a device
resource file (DRF)."""


import izot.resources.base

userdefined = izot.resources.base.Drf(
    program_id='90:00:01:06:00:00:00:00',
    scope=4,
    name='apollodev',
    version=(1, 43),
    doc="""This file is a scope 4 type file.  It contains user network
    variable types, configuration property types, and the enumeration types
    that support them.  This LonMark Device Resource TYP file was created by
    Echelon Corporation.  Contact us at 408-938-5200 or at www.echelon.com on
    the internet."""
)