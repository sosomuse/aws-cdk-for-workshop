import { Key } from 'aws-cdk-lib/aws-kms';
import { App, Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { LoggingProtocol, Topic, TracingConfig } from 'aws-cdk-lib/aws-sns';
import { ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

class SNSInteg extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const key = new Key(this, 'CustomKey', {
      pendingWindow: Duration.days(7),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const topic = new Topic(this, 'MyTopic', {
      topicName: 'fooTopic',
      masterKey: key,
    });

    const feedbackRole = new Role(this, 'FeedbackRole', {
      assumedBy: new ServicePrincipal('sns.amazonaws.com'),
    });
    const deliveryLoggingPolicy = new ManagedPolicy(this, 'Policy', {
      document: new PolicyDocument({
        statements: [new PolicyStatement({
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:PutMetricFilter',
            'logs:PutRetentionPolicy',
          ],
          resources: ['*'],
        })],
      }),
    });
    deliveryLoggingPolicy.attachToRole(feedbackRole);

    topic.addLoggingConfig({
      protocol: LoggingProtocol.HTTP,
      failureFeedbackRole: feedbackRole,
      successFeedbackRole: feedbackRole,
      successFeedbackSampleRate: 50,
    });

    // Topic with signatureVersion
    new Topic(this, 'MyTopicSignatureVersion', {
      topicName: 'fooTopicSignatureVersion',
      signatureVersion: '2',
    });

    // Topic with tracingConfig
    new Topic(this, 'MyTopicTracingConfig', {
      topicName: 'fooTopicTracingConfig',
      tracingConfig: TracingConfig.ACTIVE,
    });

    // Can import topic
    const topic2 = new Topic(this, 'MyTopic2', {
      topicName: 'fooTopic2',
      masterKey: key,
    });
    const importedTopic = Topic.fromTopicArn(this, 'ImportedTopic', topic2.topicArn);

    const publishRole = new Role(this, 'PublishRole', {
      assumedBy: new ServicePrincipal('s3.amazonaws.com'),
    });
    importedTopic.grantPublish(publishRole);
  }
}

const app = new App();

new SNSInteg(app, 'SNSInteg');

app.synth();
