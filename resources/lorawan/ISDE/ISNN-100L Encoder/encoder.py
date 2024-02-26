import sys


def main():
    # Define the path for the output file
    # Uncomment the following file output code when debugging is required.
    # This code writes debug information to an output file for analysis.
    # Ensure to comment it back when not needed to avoid unnecessary file operations.
    # output_file = r"/var/apollo/data/lwd/res/out.txt"

    # Initialize variables
    inputStr = ""  # String to store input string
    prefixConst = "03027e"  # Prefix constant for outputValue
    postfixConst = "ff"  # Postfix constant for outputValue
    inputValue = 0  # Variable to store the input value
    fPort = 0  # Variable to store the port number
    outputValue = ""  # String to store the hexadecimal output values
    blockName = ""  # Variable to store the block name
    blockIndex = 0  # Variable to store the block index

    # Open the output file for writing (Uncomment the code below when debugging is required)
    # open(output_file, "w")

    # Loop to process the input
    while input:

        if input:
            # Read the standard input
            input_text = input()

            # Break the loop if there is no input text
            if not input_text:
                break

            # Write the input text to the output file (Uncomment the code below when debugging is required)
            """
            with open(output_file, "a") as file:
                file.write(input_text + "\n")
            """

            # Process the input value
            if "inputValue" in input_text:
                # Clean up the input string and split it into a key-value pair
                inputStr = input_text.lstrip().rstrip(",").replace('"', "")
                key, value = map(str.strip, inputStr.split(":"))
                inputValue = int(value)

                # Ensure the input value is within the range [0, 254]
                inputValue = min(max(inputValue, 0), 254)

                # Convert the input value to a zero-padded hexadecimal string
                inputValue = hex(inputValue)[2:].zfill(2)

            # Process the port number
            if "fPort" in input_text:
                # Clean up the input string and split it into a key-value pair
                inputStr = input_text.lstrip().rstrip(",").replace('"', "")
                key, value = map(str.strip, inputStr.split(":"))
                fPort = int(value)

                # Convert the port number to a zero-padded hexadecimal string
                fPort = hex(fPort)[2:].zfill(2)

            # Process the command line arguments
            if len(sys.argv) > 0:
                blockName = sys.argv[1]
                blockIndex = int(sys.argv[2])
            else:
                break
        else:
            break

    # Form the output value by concatenating the port number, prefix, input value, and postfix
    outputValue = str(fPort) + prefixConst + str(inputValue) + postfixConst

    # Write the output value to the output file (Uncomment the code below when debugging is required)
    """
    with open(output_file, "a") as file:
        file.write(
            "\n"
            + str(inputValue)
            + "\n"
            + str(blockName)
            + "\n"
            + str(blockIndex)
            + "\n"
            + "\n"
            + str(outputValue)
            + "\n"
            + str(fPort)
            + "\n"
        )
    """
    # Return the output value as a string
    return str(outputValue)


if __name__ == "__main__":
    # Call the main function and print the result
    print(main())
