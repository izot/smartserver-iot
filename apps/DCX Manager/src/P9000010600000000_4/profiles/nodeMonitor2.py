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

"""nodeMonitor2 userdefined profile, originally defined in resource file set
apollodev 90:00:01:06:00:00:00:00-4."""


import izot.resources.base
from P9000010600000000_4.userdefined import userdefined
import izot.resources.datapoints.count_32
import izot.resources.datapoints.switch
import izot.resources.datapoints.count
import P9000010600000000_4.datapoints.dataAll
import izot.resources.properties.delayTime
import P9000010600000000_4.properties.activeCount
import P9000010600000000_4.properties.delayWindow


class nodeMonitor2(izot.resources.base.Profile):
    """nodeMonitor2 userdefined profile.  """

    def __init__(self):
        super().__init__(
            key=20009,
            scope=4
        )
        self.datapoints['nvoDataSeed'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nvoDataSeed',
            profile=self,
            number=1,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nviCount1'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nviCount1',
            profile=self,
            number=2,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nviCount2'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nviCount2',
            profile=self,
            number=4,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nviCount3'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nviCount3',
            profile=self,
            number=5,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nviCount4'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nviCount4',
            profile=self,
            number=6,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nvoEnable'] = izot.resources.base.Profile.DatapointMember(
            doc="""Switch """,
            name='nvoEnable',
            profile=self,
            number=7,
            datatype=izot.resources.datapoints.switch.switch,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nviFaults'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  """,
            name='nviFaults',
            profile=self,
            number=8,
            datatype=izot.resources.datapoints.count.count,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nviCounterData'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='nviCounterData',
            profile=self,
            number=9,
            datatype=P9000010600000000_4.datapoints.dataAll.dataAll,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.INPUT
        )
        self.datapoints['nvoCount1'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nvoCount1',
            profile=self,
            number=10,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nvoCount2'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nvoCount2',
            profile=self,
            number=11,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nvoCount3'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nvoCount3',
            profile=self,
            number=12,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nvoCount4'] = izot.resources.base.Profile.DatapointMember(
            doc="""Absolute count.  A 32-bit counter.""",
            name='nvoCount4',
            profile=self,
            number=13,
            datatype=izot.resources.datapoints.count_32.count_32,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.datapoints['nvoCounterData'] = izot.resources.base.Profile.DatapointMember(
            doc=""" """,
            name='nvoCounterData',
            profile=self,
            number=14,
            datatype=P9000010600000000_4.datapoints.dataAll.dataAll,
            mandatory=True,
            direction=izot.resources.base.Profile.DatapointMember.OUTPUT
        )
        self.properties['cpDelay'] = izot.resources.base.Profile.PropertyMember(
            doc="""Delay time, default to scene.  The delay time, default to
            scene.""",
            name='cpDelay',
            profile=self,
            number=1,
            datatype=izot.resources.properties.delayTime.delayTime,
            default=b'\x00\x32',
            mandatory=True
        )
        self.properties['cpActive'] = izot.resources.base.Profile.PropertyMember(
            doc=""" """,
            name='cpActive',
            profile=self,
            number=2,
            datatype=P9000010600000000_4.properties.activeCount.activeCount,
            default=b'\x00',
            mandatory=True
        )
        self.properties['cpRandomWindow'] = izot.resources.base.Profile.PropertyMember(
            doc=""" Random window to and to delay.""",
            name='cpRandomWindow',
            profile=self,
            number=3,
            datatype=P9000010600000000_4.properties.delayWindow.delayWindow,
            default=b'\x00\x00\x0f\xa0',
            mandatory=True
        )
        self._original_name = 'UFPTnodeMonitor2'
        self._definition = userdefined.add(self)
        self.finalize()


if __name__ == '__main__':
    # unit test code.
    item = nodeMonitor2()
    pass