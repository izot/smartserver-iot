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

"""gasMonitorX2 userdefined profile, originally defined in resource file set
apollodev 90:00:01:06:00:00:00:00-4."""


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined
import izot.resources.datapoints.state
import P9000010600000000_4.datapoints.Sensor
import P9000010600000000_4.datapoints.FmkSetup
import izot.resources.datapoints.ppm_f
import P9000010600000000_4.datapoints.fieldCsv
import P9000010600000000_4.datapoints.msgData
import izot.resources.datapoints.count
import P9000010600000000_4.properties.destTarget


class gasMonitorX2(izot.resources.base.Profile):
    """gasMonitorX2 userdefined profile.  Gas Sesnosr Monitor.  """

    def __init__(self):
        super().__init__(
            key=20017,
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
        self.datapoints['ErrorX'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='ErrorX',
            profile=self,
            number=6,
            datatype=P9000010600000000_4.datapoints.fieldCsv.fieldCsv,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['StateX'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='StateX',
            profile=self,
            number=7,
            datatype=P9000010600000000_4.datapoints.fieldCsv.fieldCsv,
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
        self.datapoints['SetupX'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='SetupX',
            profile=self,
            number=9,
            datatype=P9000010600000000_4.datapoints.fieldCsv.fieldCsv,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['Alarm1'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='Alarm1',
            profile=self,
            number=10,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['Alarm2'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='Alarm2',
            profile=self,
            number=11,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['Fault'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='Fault',
            profile=self,
            number=12,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['Warning'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='Warning',
            profile=self,
            number=13,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['Maint'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='Maint',
            profile=self,
            number=14,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['Disabled'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='Disabled',
            profile=self,
            number=15,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['SensorX'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='SensorX',
            profile=self,
            number=16,
            datatype=P9000010600000000_4.datapoints.fieldCsv.fieldCsv,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['setSensor'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='setSensor',
            profile=self,
            number=17,
            datatype=P9000010600000000_4.datapoints.fieldCsv.fieldCsv,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['setSetup'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='setSetup',
            profile=self,
            number=18,
            datatype=P9000010600000000_4.datapoints.fieldCsv.fieldCsv,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.properties['nciTarget'] = izot.resources.base.Profile.PropertyMember(
            doc=""" """,
            name='nciTarget',
            profile=self,
            number=1,
            datatype=P9000010600000000_4.properties.destTarget.destTarget,
            default=b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
                b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00',
            mandatory=True
        )
        self._original_name = 'UFPTgasMonitorX2'
        self._definition = userdefined.add(self)
        self.finalize()


if __name__ == '__main__':
    # unit test code.
    item = gasMonitorX2()
    pass
