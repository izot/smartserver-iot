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

"""gasMonitorX userdefined profile, originally defined in resource file set
apollodev 90:00:01:06:00:00:00:00-4."""


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined
import izot.resources.datapoints.state
import P9000010600000000_4.datapoints.Sensor
import P9000010600000000_4.datapoints.FmkSetup
import izot.resources.datapoints.ppm_f
import izot.resources.datapoints.count
import P9000010600000000_4.datapoints.msgData


class gasMonitorX(izot.resources.base.Profile):
    """gasMonitorX userdefined profile.  Gas Sesnosr Monitor.  """

    def __init__(self):
        super().__init__(
            key=20015,
            scope=4
        )
        self.datapoints['nvoError'] = izot.resources.base.Profile.DatapointMember(
            doc="""State vector.  Each state is a boolean single bit value.
            SNVT_state_64 is preferred.""",
            name='nvoError',
            profile=self,
            number=1,
            datatype=izot.resources.datapoints.state.state,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nvoSensor'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='nvoSensor',
            profile=self,
            number=3,
            datatype=P9000010600000000_4.datapoints.Sensor.Sensor,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nvoSetup'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='nvoSetup',
            profile=self,
            number=4,
            datatype=P9000010600000000_4.datapoints.FmkSetup.FmkSetup,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nvoState'] = izot.resources.base.Profile.DatapointMember(
            doc="""State vector.  Each state is a boolean single bit value.
            SNVT_state_64 is preferred.""",
            name='nvoState',
            profile=self,
            number=5,
            datatype=izot.resources.datapoints.state.state,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nvoGasConc'] = izot.resources.base.Profile.DatapointMember(
            doc="""Concentration """,
            name='nvoGasConc',
            profile=self,
            number=2,
            datatype=izot.resources.datapoints.ppm_f.ppm_f,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nvoErrorX'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='nvoErrorX',
            profile=self,
            number=6,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nvoStateX'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='nvoStateX',
            profile=self,
            number=7,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nviMsg'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='nviMsg',
            profile=self,
            number=8,
            datatype=P9000010600000000_4.datapoints.msgData.msgData,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self._original_name = 'UFPTgasMonitorX'
        self._definition = userdefined.add(self)
        self.finalize()


if __name__ == '__main__':
    # unit test code.
    item = gasMonitorX()
    pass
