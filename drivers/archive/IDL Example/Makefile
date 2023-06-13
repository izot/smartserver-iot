IDI_PATH=$(shell pwd)
RELEASE=$(IDI_PATH)/example
CFLAGS += -g -Wall -I$(IDI_PATH)
LIBS=-lidl -lmosquitto -lpthread -lrt

CSRC        = main.cpp example.cpp

all: $(RELEASE) $(DEBUG)

$(RELEASE): $(CSRC)
	$(CXX) $(CFLAGS) -o $(RELEASE) $(CSRC) $(LIBS)

clean:
	    rm -rf $(RELEASE) $(DEBUG) 

.PHONY: clean

