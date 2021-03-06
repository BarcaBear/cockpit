/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import '../lib/patternfly/patternfly-4-cockpit.scss';
import 'polyfills'; // once per application

import cockpit from "cockpit";

import React from "react";
import ReactDOM from "react-dom";

import { KdumpPage } from "./kdump-view.jsx";
import * as kdumpClient from "./kdump-client.js";
import { superuser } from "superuser";

superuser.reload_page_on_change();

const initStore = function(rootElement) {
    const dataStore = { };
    dataStore.domRootElement = rootElement;

    dataStore.kdumpClient = new kdumpClient.KdumpClient();

    dataStore.applySettings = settings =>
        dataStore.kdumpClient.validateSettings(settings)
                .then(() => dataStore.kdumpClient.writeSettings(settings));

    // whether we're actively trying to change the state
    dataStore.stateChanging = false;
    function setServiceState(desiredState) {
        if (dataStore.stateChanging) {
            console.log("already trying to change state");
            return;
        }
        const promise = desiredState ? dataStore.kdumpClient.ensureOn() : dataStore.kdumpClient.ensureOff();
        dataStore.stateChanging = true;
        dataStore.render();
        promise.finally(function() {
            dataStore.stateChanging = false;
            dataStore.render();
        });
    }
    const render = function() {
        ReactDOM.render(React.createElement(KdumpPage, {
            kdumpActive: false,
            onSetServiceState: setServiceState,
            stateChanging: dataStore.stateChanging,
            reservedMemory: dataStore.kdumpMemory,
            kdumpStatus: dataStore.kdumpStatus,
            onApplySettings: dataStore.applySettings,
            onCrashKernel: dataStore.kdumpClient.crashKernel,
        }), rootElement);
    };
    dataStore.render = render;

    // read memory reserved for kdump from system
    dataStore.kdumpMemory = undefined;
    // HACK cockpit.file() can't be used for /sys yet, since those files can't be mapped
    // https://github.com/cockpit-project/cockpit/issues/5597
    // cockpit.file("/sys/kernel/kexec_crash_size").read()
    cockpit.spawn(["cat", "/sys/kernel/kexec_crash_size"])
            .then(content => {
                const value = parseInt(content, 10);
                if (!isNaN(value)) {
                // if it's only a number, guess from the size what units we should use
                // https://access.redhat.com/solutions/59432 states limit to be 896M and the auto at 768M max
                // default unit is M
                    if (value >= 1000000)
                        dataStore.kdumpMemory = cockpit.format_bytes(value);
                    else if (value >= 1000)
                        dataStore.kdumpMemory = cockpit.format_bytes(value * 1024);
                    else
                        dataStore.kdumpMemory = cockpit.format_bytes(value * 1024 * 1024);
                } else {
                    dataStore.kdumpMemory = content.trim();
                }
            })
            .catch(() => { dataStore.kdumpMemory = "error" })
            .finally(render);

    // catch kdump config and service changes
    dataStore.kdumpClient.addEventListener('kdumpStatusChanged', function(event, status) {
        dataStore.kdumpStatus = status;
        render();
    });

    // render once
    render();

    return dataStore;
};

document.addEventListener("DOMContentLoaded", function() {
    initStore(document.getElementById('app'));
});
