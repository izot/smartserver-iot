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

"""occSensor2 userdefined profile, originally defined in resource file set
apollodev 90:00:01:06:00:00:00:00-4."""


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined
import izot.resources.profiles.occupancySensor
import P9000010600000000_4.datapoints.setbackMinutes
import izot.resources.datapoints.switch_2
import P9000010600000000_4.properties.occCntlMode


class occSensor2(izot.resources.profiles.occupancySensor.occupancySensor):
    """occSensor2 userdefined profile.  """

    def __init__(self):
        super().__init__()
        self._override_scope(4)
        self.datapoints['nvoLoEmin'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='nvoLoEmin',
            profile=self,
            number=1,
            datatype=P9000010600000000_4.datapoints.setbackMinutes.setbackMinutes,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nvoSw2Value'] = izot.resources.base.Profile.DatapointMember(
            doc="""Switch with scene and setting control.  An enhanced
            version of SNVT_switch with scene and setting controls similar to
            SNVT_scene and SNVT_setting.""",
            name='nvoSw2Value',
            profile=self,
            number=2,
            datatype=izot.resources.datapoints.switch_2.switch_2,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.properties['cpControlMode'] = izot.resources.base.Profile.PropertyMember(
            doc=""" """,
            name='cpControlMode',
            profile=self,
            number=1,
            datatype=P9000010600000000_4.properties.occCntlMode.occCntlMode,
            default=b'\x00',
            mandatory=True
        )
        self._original_name = 'UFPToccSensor2'
        self._definition = userdefined.add(self)
        self.finalize()


if __name__ == '__main__':
    # unit test code.
    item = occSensor2()
    pass
