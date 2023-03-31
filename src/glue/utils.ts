/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as nls from 'vscode-nls'
const localize = nls.loadMessageBundle()

import { Glue } from 'aws-sdk'
import * as vscode from 'vscode'
import { GlueClient } from '../shared/clients/glueClient'

export async function* listGlueJobs(client: GlueClient): AsyncIterableIterator<Glue.Job> {
    const status = vscode.window.setStatusBarMessage(
        localize('AWS.message.statusBar.loading.glueJobs', 'Loading Glue Jobs...')
    )

    try {
        yield* client.listJobs()
    } finally {
        if (status) {
            status.dispose()
        }
    }
}

export async function* listGlueJobRuns(client: GlueClient, JobName: string): AsyncIterableIterator<Glue.JobRun> {
    const status = vscode.window.setStatusBarMessage(
        localize('AWS.message.statusBar.loading.glueJobRuns', 'Loading Job Runs...')
    )

    try {
        yield* client.listJobRuns(JobName)
    } finally {
        if (status) {
            status.dispose()
        }
    }
}