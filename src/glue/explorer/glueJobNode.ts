/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Glue } from 'aws-sdk'
import { AWSResourceNode } from '../../shared/treeview/nodes/awsResourceNode'
import { AWSTreeNodeBase } from '../../shared/treeview/nodes/awsTreeNodeBase'

export class GlueJobNode extends AWSTreeNodeBase implements AWSResourceNode {

    public constructor(
        public readonly parent: AWSTreeNodeBase,
        public override readonly regionCode: string,
        public configuration: Glue.Job
    ) {
        super('')
        this.update(configuration)
        // this.iconPath = getIcon('tbd2')
    }

    public update(configuration: Glue.Job): void {
        this.configuration = configuration
        this.label = this.configuration.Name || ''
        this.tooltip = this.configuration.Name
    }

    public get arn(): string {
        // AWS::Glue::Job does not return its ARN
        return "tbd1"
    }

    public get name(): string {
        if (this.configuration.Name === undefined) {
            throw new Error('Name expected but not found')
        }

        return this.configuration.Name
    }
}