When developing in wsl, there is time drift vs the actual system clock. This causes problems when connecting with Azure Cosmos Db because the certificate is only good for a short time and the drift can be greater than this.

To fix, run:
``` sudo ntpdate time.windows.com
