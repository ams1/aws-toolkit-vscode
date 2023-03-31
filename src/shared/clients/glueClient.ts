/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Glue } from 'aws-sdk'
import { Job, JobRun } from 'aws-sdk/clients/glue'
import globals from '../extensionGlobals'
import { ClassToInterfaceType } from '../utilities/tsUtils'


export type GlueClient = ClassToInterfaceType<DefaultGlueClient>
export class DefaultGlueClient {
    public constructor(public readonly regionCode: string) {}

    public async *listJobs(): AsyncIterableIterator<Job> {
        const client = await this.createSdkClient()

        const request: Glue.GetJobsRequest = {}
        do {
            const response: Glue.GetJobsResponse = await client.getJobs(request).promise()

            if (response.Jobs) {
                yield* response.Jobs
            }

            request.NextToken = response.NextToken
        } while (request.NextToken !== undefined)
    }

    public async *listJobRuns(JobName: string): AsyncIterableIterator<JobRun> {
        const client = await this.createSdkClient()

        const request: Glue.GetJobRunsRequest = {JobName: JobName}
        do {
            const response: Glue.GetJobRunsResponse = await client.getJobRuns(request).promise()

            if (response.JobRuns) {
                yield* response.JobRuns
            }

            request.NextToken = response.NextToken
        } while (request.NextToken !== undefined)
    }

    private async createSdkClient(): Promise<Glue> {
        return await globals.sdkClientBuilder.createAwsService(Glue, undefined, this.regionCode)
    }
}