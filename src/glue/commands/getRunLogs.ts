/*!
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


import * as nls from 'vscode-nls'
const localize = nls.loadMessageBundle()

import * as vscode from 'vscode'

import { createCommonButtons } from "../../shared/ui/buttons";
import { createRegionPrompter } from "../../shared/ui/common/region";
import { createQuickPick, DataQuickPickItem } from "../../shared/ui/pickerPrompter";
import { toArrayAsync } from '../../shared/utilities/collectionUtils';
import { addCodiconToString } from "../../shared/utilities/textUtilities";
import { Wizard } from "../../shared/wizards/wizard";
import { GlueJobNode } from "../explorer/glueJobNode";
import { listGlueJobRuns } from '../utils';
import { JobRun } from 'aws-sdk/clients/glue'
import moment = require('moment');
import { LOCALIZED_DATE_FORMAT } from '../../shared/constants';
import { DefaultCloudWatchLogsClient } from '../../shared/clients/cloudWatchLogsClient';
import { CloudWatchLogs } from 'aws-sdk';
import { LogGroupNode } from '../../cloudWatchLogs/explorer/logGroupNode';


export interface SelectGlueJobRunLogStreamResponse {
    region: string
    logGroupName: string
    logStreamName: string
    node: GlueJobNode
    jobRunId: string
}

export async function viewGlueJobRunLogStream(node: GlueJobNode): Promise<void> {
    const runLogStreamResponse = await new SelectGlueJobRunLogStreamWizard(node).run()

    if (runLogStreamResponse) {

        const logGroup: CloudWatchLogs.LogGroup = <CloudWatchLogs.LogGroup>{ logGroupName: runLogStreamResponse.logGroupName };
        const logGroupNode = new LogGroupNode(node.regionCode, logGroup);

        await vscode.commands.executeCommand(
            'aws.cloudWatchLogs.viewLogStream',
            logGroupNode,
            runLogStreamResponse.logStreamName
        )
    }
}

export class SelectGlueJobRunLogStreamWizard extends Wizard<SelectGlueJobRunLogStreamResponse>{

    public constructor(node: GlueJobNode) {
        super({ initState: { node } })
        this.form.node.regionCode.bindPrompter(() => createRegionPrompter().transform(region => region.id))
        this.form.jobRunId.bindPrompter((state) => createJobRunIdPrompter(state.node!))
        this.form.logGroupName.bindPrompter((state) => createLogGroupNamePrompter(state.node!.name))
        this.form.logStreamName.bindPrompter((state) => createLogStreamNamePrompter(state.region!, state.logGroupName!, state.jobRunId!, state.node!.name))
    }
}

/**
 * Selects the Glue Job Run and proceeds with the rest of the workflow.
 */
function createJobRunIdPrompter(node: GlueJobNode) {

    // TODO: refactor below
    const jobRuns = listGlueJobRuns(node.client, node.name);
    const items = toArrayAsync(convertJobRunToDataQuickPickItems(jobRuns))

    return createQuickPick(items, {
        title: localize('AWS.glue.jobRunId.title', `${node.name}: Select a Job Run`),
        // TODO: think about awsConsoleUri parameter used below
        buttons: createCommonButtons(),
    })
}

/**
 * Selects the Cloudwatch Logs Group Name and proceeds with the rest of the workflow.
 */
function createLogGroupNamePrompter(jobName: string) {
    // TODO: maybe remove icon from below
    const items: DataQuickPickItem<string>[] = [
        {
            label: addCodiconToString('folder', localize('AWS.glue.logGroupName.allLogs', 'All logs')),
            data: '/aws-glue/jobs/logs-v2',
        },
        {
            label: addCodiconToString('folder', localize('AWS.glue.logGroupName.outputLogs', 'Output logs')),
            data: '/aws-glue/jobs/output',
        },
        {
            label: addCodiconToString('folder', localize('AWS.glue.logGroupName.errorLogs', 'Error logs')),
            data: '/aws-glue/jobs/error',
        },
    ]

    return createQuickPick(items, {
        title: localize('AWS.glue.logGroupName.title', `${jobName}: Select Log Group`),
        buttons: createCommonButtons(),
    })
}

/**
 * Selects the Cloudwatch Logs Stream Name and proceeds with the rest of the workflow.
 */
function createLogStreamNamePrompter(region: string, logGroupName: string, logStreamNamePrefix: string, jobName: string) {
    const items = toArrayAsync(convertLogStreamNames2DataQuickPickItems(logGroupName, logStreamNamePrefix, region))

    return createQuickPick(items, {
        title: localize('AWS.glue.logStreamName.title', `${jobName}: Select Log Stream`),
        buttons: createCommonButtons(),
    })
}


/**
 * Temp until the viewLogStream.convertDescribeLogToQuickPickItems gets upgraded to Wizard/DataQuickPickItem
 */
export function convertDescribeLogToQuickPickItemsTemp(
    response: CloudWatchLogs.DescribeLogStreamsResponse
): DataQuickPickItem<string>[] {
    return (response.logStreams ?? []).map<DataQuickPickItem<string>>(stream => ({
        label: stream.logStreamName!,
        detail: stream.lastEventTimestamp
            ? moment(stream.lastEventTimestamp).format(LOCALIZED_DATE_FORMAT)
            : localize('AWS.cloudWatchLogs.viewLogStream.workflow.noStreams', '[No Log Events found]'),
        data: stream.logStreamName!
    }))
}


async function* convertLogStreamNames2DataQuickPickItems(logGroupName: string, logStreamNamePrefix: string, regionCode:string): AsyncIterableIterator<DataQuickPickItem<string>> {

    if (!logStreamNamePrefix) {
        throw new Error("No logStreamNamePrefix!");
    }

    // all Log Streams linked to the Glue Job Run have the same prefix
    const request: CloudWatchLogs.DescribeLogStreamsRequest = {
        logGroupName: logGroupName,
        logStreamNamePrefix: logStreamNamePrefix,
        //           ^^^^^^ (!)
    }
    const client = new DefaultCloudWatchLogsClient(regionCode);

    console.log(request)

    do {
        const response: CloudWatchLogs.DescribeLogStreamsResponse = await client.describeLogStreams(request)

        const result: DataQuickPickItem<string>[] = convertDescribeLogToQuickPickItemsTemp(response)

        yield* result

        request.nextToken = response.nextToken
    } while (request.nextToken !== undefined)

}

async function* convertJobRunToDataQuickPickItems(jobRuns: AsyncIterableIterator<JobRun>): AsyncIterableIterator<DataQuickPickItem<string>> {

    const result: DataQuickPickItem<string>[] = []

    for await (const jobRun of jobRuns) {
        // add icons for jub run state
        let icon;
        switch (jobRun.JobRunState) {
            case "SUCCEEDED":
                icon = 'pass';
                break;
            case "FAILED":
                icon = 'error';
                break;
            case "RUNNING":
                icon = 'run-all';
                break;
            case "STOPPED":
                icon = 'stop-circle';
                break;
            default:
                icon = 'folder';
                break;
        }

        result.push({
            // TODO: add job run duration to detail
            label: addCodiconToString(icon, localize('AWS.generic.filetype.zipfile', `${jobRun.Id}`)),
            detail: moment(jobRun.StartedOn).format(LOCALIZED_DATE_FORMAT),
            data: jobRun.Id,
        })
    }

    yield* result
}