const soap = require('strong-soap').soap;
const util = require('util')
const url = "./axl/10.5/AXLAPI.wsdl";
const auth = "Basic " + Buffer.from("Admin" + ":" + "password").toString("base64");
const ucmIp = "10.1.10.1"

module.exports = function(controller) {

    controller.hears(['get phone'], 'direct_message,direct_mention', function(bot, message) {

        bot.createConversation(message, function(err, convo) {

            convo.addMessage({
                    text: 'Great!  We found the phone with description {{vars.description}}',
            }, 'found');

            convo.addMessage({
                text: `Sorry, we didn't find a device with that MAC address`,
                action: 'default',
            },'not_found');

            convo.addMessage({
                text: `Sorry, looks like there was a error...`,
                action: 'stop', // this marks the converation as unsuccessful
            },'error');

            convo.ask(`Okay, what's the MAC address of the phone you'd like to find?`, [
                {
                    pattern:  '.*',
                    callback: function(response, convo) {
                        
                        const args = {
                            name: response.text
                        };

                        soap.createClient(url, function(err, client) {
                            client.setEndpoint(`https://${ucmIp}:8443/axl/`);
                            client.addHttpHeader("Authorization", auth);
                            client.addHttpHeader("Content-Type", "text/xml; charset=utf-8")
                            client.addHttpHeader("SOAPAction", "CUCM:DB ver=10.5 getPhone")
                            client.setSecurity(
                                new soap.ClientSSLSecurity(
                                    undefined,undefined, undefined, {
                                        rejectUnauthorized: false,
                                    },
                                )
                            );
                        
                            client.getPhone(args, function(err,result) {
                                if (err) {
                                    convo.gotoThread('not_found');
                                    console.log("soap api error is: " + err);
                                    console.log("last request: " + client.lastRequest);
                                    process.exit(1);
                                }
                        
                                console.log(util.inspect(result.return.phone.description))
                                convo.setVar('description', util.inspect(result.return.phone.description));
                                convo.gotoThread('found');
                            });
                        
                            if (err) {
                                console.log("soap client error is: " + err);
                                convo.gotoThread('error');
                            }
                        });
                    },
                },
            ], 'default');

            convo.activate();
            
        });

    });
};
