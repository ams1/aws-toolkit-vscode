/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as nls from 'vscode-nls'
const localize = nls.loadMessageBundle()

import * as vscode from 'vscode'
import { DefaultGlueClient } from '../../shared/clients/glueClient';
import { AWSTreeNodeBase } from '../../shared/treeview/nodes/awsTreeNodeBase'
import { PlaceholderNode } from '../../shared/treeview/nodes/placeholderNode';
import { makeChildrenNodes } from '../../shared/treeview/utils';
import { GlueJobNode } from './glueJobNode';
import { toArrayAsync, toMap, updateInPlace } from '../../shared/utilities/collectionUtils';
import { listGlueJobs } from '../utils';
import { Glue } from 'aws-sdk';


export class GlueNode extends AWSTreeNodeBase {
    private readonly jobNodes: Map<string, GlueJobNode>

    public constructor(
        public override readonly regionCode: string,
        private readonly client = new DefaultGlueClient(regionCode)
    ) {
        super('Glue', vscode.TreeItemCollapsibleState.Collapsed)
        this.jobNodes = new Map<string, GlueJobNode>()
        this.contextValue = 'awsGlueNode'
    }

    public async updateChildren(): Promise<void> {
        const jobs: Map<string, Glue.Job> = toMap(
            await toArrayAsync(listGlueJobs(this.client)),
            configuration => configuration.Name
        )

        updateInPlace(
            this.jobNodes,
            jobs.keys(),
            key => this.jobNodes.get(key)!.update(jobs.get(key)!),
            key => makeGlueJobNode(this, this.regionCode, jobs.get(key)!)
        )
    }

    public override async getChildren(): Promise<AWSTreeNodeBase[]> {
        return await makeChildrenNodes({
            getChildNodes: async () => {
                await this.updateChildren()
                return [...this.jobNodes.values()]
            },
            getNoChildrenPlaceholderNode: async () =>
                new PlaceholderNode(this, localize('AWS.explorerNode.glue.noFunctions', '[No Glue Jobs found]')),
            // sort: (nodeA, nodeB) => nodeA.Name.localeCompare(nodeB.Name),
        })
    }
}

function makeGlueJobNode(
    parent: AWSTreeNodeBase,
    regionCode: string,
    configuration: Glue.Job
): GlueJobNode {
    const node = new GlueJobNode(parent, regionCode, configuration)
    return node
}
