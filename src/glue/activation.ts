/*!
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtContext } from '../shared/extensions'
import { Commands } from '../shared/vscode/commands2'
import { viewGlueJobRunLogStream } from './commands/getRunLogs';
import { GlueJobNode } from './explorer/glueJobNode';

/**
 * Activates Glue components.
 */
export async function activate(context: ExtContext): Promise<void> {
    context.extensionContext.subscriptions.push(
        Commands.register(
            'aws.glueJobRunsCloudwatchLogs', 
            async (node: GlueJobNode) => await viewGlueJobRunLogStream(node)
        )
    )
}
